import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Report } from './report.entity';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { UserSanction } from '../users/user-sanction.entity';
import { ReportTargetType, ReportStatus, ReportActionResult, ReportReasonCode } from './reports.enum';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportAdminDto } from './dto/update-report-admin.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserSanction)
    private readonly sanctionRepository: Repository<UserSanction>,
    private readonly dataSource: DataSource,
  ) {}

  async create(reporterId: number, dto: CreateReportDto): Promise<Report> {
    // 1. 1차 MVP 제한: JOB 타입만 허용
    if (dto.targetType !== ReportTargetType.JOB) {
      throw new BadRequestException('현재는 게시물(JOB) 신고만 가능합니다.');
    }

    // 2. 사유 검증 (OTHER인 경우 상세 내용 필수)
    if (dto.reasonCode === ReportReasonCode.OTHER && (!dto.reasonDetail || dto.reasonDetail.trim() === '')) {
      throw new BadRequestException('기타 사유를 선택하신 경우 상세 내용을 입력해 주세요.');
    }

    // 3. 대상 게시물 존재 및 유효성 확인
    const job = await this.jobsRepository.findOne({ where: { id: dto.targetId } });
    if (!job || job.status === 'deleted') {
      throw new NotFoundException('존재하지 않거나 삭제된 게시물입니다.');
    }

    // 4. 본인 게시물 신고 불가
    if (job.userId === reporterId) {
      throw new BadRequestException('본인이 작성한 게시물은 신고할 수 없습니다.');
    }

    // 5. 중복 신고 확인
    const existingReport = await this.reportsRepository.findOne({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
      },
    });
    if (existingReport) {
      throw new ConflictException('이미 신고한 게시물입니다.');
    }

    // 6. 신고 생성 및 스냅샷 저장
    const newReport: Partial<Report> = {
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      targetAuthorId: job.userId as number,
      targetSnapshotTitle: job.title,
      reasonCode: dto.reasonCode,
      reasonDetail: dto.reasonDetail,
      status: ReportStatus.PENDING,
    };

    const report = this.reportsRepository.create(newReport);
    return this.reportsRepository.save(report);
  }

  async updateStatus(adminId: number, reportId: number, dto: UpdateReportAdminDto): Promise<Report> {
    const report = await this.reportsRepository.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('신고 내역을 찾을 수 없습니다.');
    }

    const isClosing = dto.status === ReportStatus.RESOLVED || dto.status === ReportStatus.DISMISSED;
    // 이미 처리된 신고인지 확인 (재처리 시 sanctionCount 중복 방지)
    const wasAlreadyProcessed = report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED;

    report.status = dto.status;
    report.actionResult = dto.actionResult;
    report.adminMemo = dto.adminMemo || report.adminMemo;

    if (isClosing) {
      report.processedAt = new Date();
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. RESOLVED 처리 시 신고 대상 게시물 자동 블라인드
      if (dto.status === ReportStatus.RESOLVED && report.targetType === ReportTargetType.JOB && report.targetId) {
        const job = await manager.findOne(Job, { where: { id: report.targetId } });
        if (job && job.status !== 'deleted') {
          job.status = dto.actionResult === ReportActionResult.POST_DELETED ? 'deleted' : 'hidden';
          await manager.save(Job, job);
        }
      }

      // 2. 사용자 제재 처리 (재처리 시 sanctionCount 중복 누적 방지)
      if (
        !wasAlreadyProcessed &&
        report.targetAuthorId &&
        [ReportActionResult.USER_WARNED, ReportActionResult.USER_SUSPENDED, ReportActionResult.USER_BANNED].includes(dto.actionResult)
      ) {
        const user = await manager.findOne(User, { where: { id: report.targetAuthorId } });
        if (user) {
          let sanctionType = '';
          let durationDays = 0;
          let userStatus = 'ACTIVE';

          if (dto.actionResult === ReportActionResult.USER_WARNED) {
            sanctionType = 'WARNING';
            userStatus = 'WARNED';
          } else if (dto.actionResult === ReportActionResult.USER_SUSPENDED) {
            sanctionType = 'SUSPENSION_7';
            durationDays = 7;
            userStatus = 'SUSPENDED';
          } else if (dto.actionResult === ReportActionResult.USER_BANNED) {
            sanctionType = 'BAN';
            userStatus = 'BANNED';
          }

          user.status = userStatus;
          user.sanctionCount = (user.sanctionCount || 0) + 1;
          await manager.save(User, user);

          const sanction = manager.create(UserSanction, {
            userId: user.id,
            type: sanctionType,
            reason: this.getReasonLabel(report.reasonCode),
            adminMemo: dto.adminMemo || '신고 처리에 따른 자동 제재',
            durationDays: (durationDays > 0 ? durationDays : null) as number,
          });
          await manager.save(UserSanction, sanction);
        }
      }

      return await manager.save(Report, report);
    });
  }

  private getReasonLabel(code: string): string {
    const labels: Record<string, string> = {
        'SPAM': '스팸/영리목적',
        'INAPPROPRIATE': '성격에 맞지 않음',
        'OFFENSIVE': '욕설/비하 표현',
        'FALSE_INFO': '허위 정보/사기',
        'DUPLICATE': '중복 게시물',
        'OTHER': '기타',
    };
    return labels[code] || code;
  }

  async findAllAdmin(query: any): Promise<any[]> {
    const { status } = query;
    const where: any = {};

    if (status && status !== 'ALL' && Object.values(ReportStatus).includes(status as ReportStatus)) {
      where.status = status;
    }

    const reports = await this.reportsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['reporter'],
    });

    return Promise.all(reports.map(async r => {
      let reporter: User | null = r.reporter;
      if (!reporter && r.reporterId) {
          reporter = await this.usersRepository.findOne({ where: { id: Number(r.reporterId) } });
      }
      const reporterDisplayName = reporter?.nickname || reporter?.name || reporter?.email || `회원(#${r.reporterId})`;

      let targetTitle = r.targetSnapshotTitle || '정보 없음';
      let targetAuthorDisplayName = '정보 없음';

      if (r.targetType === 'JOB' && r.targetId) {
          const job = await this.jobsRepository.findOne({ 
              where: { id: Number(r.targetId) }, 
              relations: ['user', 'center'] 
          });
          
          if (job) {
              targetTitle = job.title || r.targetSnapshotTitle || '정보 없음';
              targetAuthorDisplayName = job.center?.name || job.companyName || job.user?.nickname || job.user?.name || job.user?.email || '정보 없음';
          } 
          
          if ((targetAuthorDisplayName === '정보 없음' || !targetAuthorDisplayName) && r.targetAuthorId) {
              const author = await this.usersRepository.findOne({ where: { id: Number(r.targetAuthorId) } });
              if (author) {
                  targetAuthorDisplayName = author.nickname || author.name || author.email || `회원(#${r.targetAuthorId})`;
              }
          }
      }

      return {
          id: r.id,
          createdAt: r.createdAt,
          type: r.targetType === 'JOB' ? '게시물' : '사용자',
          targetId: r.targetId,
          reporterDisplayName,
          targetTitle,
          targetAuthorDisplayName,
          status: r.status,
          reason: this.getReasonLabel(r.reasonCode as string),
          reasonCode: r.reasonCode,
          detail: r.reasonDetail,
          adminMemo: r.adminMemo,
          actionResult: r.actionResult
      };
    }));
  }

  async findOneAdmin(id: number): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id },
      relations: ['reporter', 'processedBy'],
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }
}
