import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Report } from './report.entity';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
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
    const report = this.reportsRepository.create({
      reporterId,
      targetType: dto.targetType,
      targetId: dto.targetId,
      targetSnapshotTitle: job.title,
      reasonCode: dto.reasonCode,
      reasonDetail: dto.reasonDetail,
      status: ReportStatus.PENDING,
      actionResult: ReportActionResult.NONE,
    });

    return this.reportsRepository.save(report);
  }

  async updateStatus(adminId: number, reportId: number, dto: UpdateReportAdminDto): Promise<Report> {
    const report = await this.reportsRepository.findOne({ where: { id: reportId } });
    if (!report) {
      throw new NotFoundException('신고 내역을 찾을 수 없습니다.');
    }

    // 상태 요건 확인
    const isClosing = dto.status === ReportStatus.RESOLVED || dto.status === ReportStatus.DISMISSED;

    report.status = dto.status;
    report.actionResult = dto.actionResult;
    report.adminMemo = dto.adminMemo || report.adminMemo;

    // 종료 상태일 때만 처리자 정보 기록
    if (isClosing) {
      report.processedById = adminId;
      report.processedAt = new Date();
    }

    // 트랜잭션으로 처리 (연관 도메인 상태 변경 포함)
    return await this.dataSource.transaction(async (manager) => {
      // 1. 게시물 숨김 처리 연동
      if (report.targetType === ReportTargetType.JOB && dto.actionResult === ReportActionResult.POST_HIDDEN) {
        const job = await manager.findOne(Job, { where: { id: report.targetId } });
        if (job && job.status !== 'deleted') {
          job.status = 'hidden';
          await manager.save(Job, job);
        }
      }
      
      // 2. 게시물 삭제 처리 연동
      if (report.targetType === ReportTargetType.JOB && dto.actionResult === ReportActionResult.POST_DELETED) {
        const job = await manager.findOne(Job, { where: { id: report.targetId } });
        if (job && job.status !== 'deleted') {
          job.status = 'deleted';
          await manager.save(Job, job);
        }
      }

      return await manager.save(Report, report);
    });
  }

  async findAllAdmin(query: any): Promise<Report[]> {
    const { status } = query;
    const where: any = {};

    // status가 존재하고 'ALL'이 아닐 때만 필터링 적용
    if (status && status !== 'ALL' && Object.values(ReportStatus).includes(status as ReportStatus)) {
      where.status = status;
    }

    return this.reportsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['reporter'],
    });
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
