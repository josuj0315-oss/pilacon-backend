import { Injectable, OnModuleInit, Logger, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

import { Admin } from './admin.entity';
import { User } from '../users/user.entity';
import { UserSanction } from '../users/user-sanction.entity';
import { UserAccessLog } from '../users/user-access-log.entity';
import { Job } from '../jobs/job.entity';
import { Report } from '../reports/report.entity';
import { ReportStatus } from '../reports/reports.enum';
import { Application } from '../applications/application.entity';
import { Favorite } from '../favorites/favorite.entity';
import { ChatRoom } from '../chat/entities/chat-room.entity';

@Injectable()
export class AdminService implements OnModuleInit {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        @InjectRepository(Admin) private adminRepository: Repository<Admin>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(UserSanction) private sanctionRepository: Repository<UserSanction>,
        @InjectRepository(UserAccessLog) private accessLogRepository: Repository<UserAccessLog>,
        @InjectRepository(Job) private jobRepository: Repository<Job>,
        @InjectRepository(Report) private reportRepository: Repository<Report>,
        @InjectRepository(Application) private applicationRepository: Repository<Application>,
        @InjectRepository(Favorite) private favoriteRepository: Repository<Favorite>,
        @InjectRepository(ChatRoom) private chatRoomRepository: Repository<ChatRoom>,
        private jwtService: JwtService
    ) {}

    async onModuleInit() {
        await this.seedInitialAdmin();
    }

    private async seedInitialAdmin() {
        const adminUser = await this.adminRepository.findOne({ where: { username: 'admin' } });
        if (!adminUser) {
            const seedPassword = process.env.ADMIN_SEED_PASSWORD;
            if (!seedPassword) {
                this.logger.error('ADMIN_SEED_PASSWORD is not set. Skipping admin seed.');
                return;
            }
            this.logger.log('Seeding initial admin user into admins table.');
            const hashedPassword = await bcrypt.hash(seedPassword, 10);
            const newAdmin = this.adminRepository.create({
                username: 'admin',
                password: hashedPassword,
                role: 'ADMIN'
            });
            await this.adminRepository.save(newAdmin);
        }
    }

    async login(body: any) {
        const { username, password } = body;
        const admin = await this.adminRepository.findOne({ where: { username } });

        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            throw new UnauthorizedException('관리자 계정 정보가 일치하지 않습니다.');
        }

        const payload = { sub: admin.id, username: admin.username, role: admin.role, isAdmin: true };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: { id: admin.id, username: admin.username, role: admin.role }
        };
    }

    async createAdmin(body: any) {
        const { username, password, nickname } = body;
        const existing = await this.adminRepository.findOne({ where: { username } });
        if (existing) throw new ConflictException('이미 존재하는 관리자 아이디입니다.');

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = this.adminRepository.create({
            username,
            password: hashedPassword,
            nickname,
            role: 'ADMIN'
        });
        return await this.adminRepository.save(newAdmin);
    }

    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalUsers, instructorCount, centerCount, activeJobs, newUsersToday, pendingReports] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ where: { role: 'INSTRUCTOR' } }),
            this.userRepository.count({ where: { role: 'CENTER' } }),
            this.jobRepository.count({ where: { status: 'active' } }),
            this.userRepository.count({ where: { createdAt: MoreThanOrEqual(today) } }),
            this.reportRepository.count({ where: { status: ReportStatus.PENDING } }),
        ]);

        return {
            totalMembers: { instructor: instructorCount, center: centerCount },
            activeJobs,
            newUsersToday,
            pendingReports,
        };
    }

    async getRecentDashboard() {
        const recentUsers = await this.userRepository.find({
            order: { createdAt: 'DESC' },
            take: 5
        });

        const recentReports = await this.reportRepository.find({
            order: { createdAt: 'DESC' },
            take: 5
        });

        const recentJobs = await this.jobRepository.find({
            where: { status: Not('deleted') },
            order: { createdAt: 'DESC' },
            take: 5,
            relations: ['center']
        });

        const formattedReports = recentReports.map(r => ({
            id: r.id,
            targetName: r.targetSnapshotTitle || '게시물 신고',
            reason: r.reasonCode,
            status: r.status,
            createdAt: r.createdAt
        }));

        const formattedJobs = recentJobs.map(j => ({
            id: j.id,
            title: j.title,
            centerName: j.center?.name || '기타',
            status: j.status === 'active' ? '노출' : '중지',
            createdAt: j.createdAt
        }));

        return {
            recentUsers,
            recentReports: formattedReports,
            recentJobs: formattedJobs
        };
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

    async getReports(status?: string) {
        // 이 메서드는 AdminReportsController에 의해 가려질 수 있음
        const where: any = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }

        const reports = await this.reportRepository.find({
            where,
            order: { createdAt: 'DESC' },
            relations: ['reporter']
        });

        const formattedReports = await Promise.all(reports.map(async r => {
            let reporter: User | null = r.reporter;
            if (!reporter && r.reporterId) {
                reporter = await this.userRepository.findOne({ where: { id: Number(r.reporterId) } });
            }
            const reporterDisplayName = reporter?.nickname || reporter?.name || reporter?.email || `회원(#${r.reporterId})`;

            let targetTitle = r.targetSnapshotTitle || '정보 없음';
            let targetAuthorDisplayName = '정보 없음';

            if (r.targetType === 'JOB' && r.targetId) {
                const job = await this.jobRepository.findOne({ 
                    where: { id: Number(r.targetId) }, 
                    relations: ['user', 'center'] 
                });
                
                if (job) {
                    targetTitle = job.title || r.targetSnapshotTitle || '정보 없음';
                    targetAuthorDisplayName = job.center?.name || job.companyName || job.user?.nickname || job.user?.name || job.user?.email || '정보 없음';
                } 
                
                if ((targetAuthorDisplayName === '정보 없음' || !targetAuthorDisplayName) && r.targetAuthorId) {
                    const author = await this.userRepository.findOne({ where: { id: Number(r.targetAuthorId) } });
                    if (author) {
                        targetAuthorDisplayName = author.nickname || author.name || author.email || `회원(#${r.targetAuthorId})`;
                    }
                }
            }

            return {
                id: r.id,
                createdAt: r.createdAt,
                type: r.targetType === 'JOB' ? '게시물' : '사용자',
                reporterDisplayName,
                targetTitle,
                targetAuthorDisplayName,
                status: r.status,
                reason: this.getReasonLabel(r.reasonCode),
                reasonCode: r.reasonCode,
                detail: r.reasonDetail
            };
        }));

        return formattedReports;
    }

    async getUsers(search?: string) {
        const query = this.userRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.centers', 'centers')
            .leftJoinAndSelect('user.instructorProfiles', 'instructorProfiles')
            .orderBy('user.createdAt', 'DESC')
            .take(100);

        if (search) {
            query.where('user.name LIKE :search', { search: `%${search}%` })
                 .orWhere('user.email LIKE :search', { search: `%${search}%` })
                 .orWhere('user.nickname LIKE :search', { search: `%${search}%` });
        }

        const users = await query.getMany();

        return users.map(u => ({
            id: u.id,
            name: u.nickname || u.name || '이름없음',
            email: u.email || u.username || '-',
            type: u.role === 'ADMIN' ? 'ADMIN' : (u.centers && u.centers.length > 0 ? 'CENTER' : 'INSTRUCTOR'),
            provider: u.provider || 'local',
            status: u.status || 'ACTIVE',
            reportCount: u.sanctionCount || 0,
            createdAt: u.createdAt
        }));
    }

    async getUserDetail(id: number) {
        const user = await this.userRepository.findOne({ 
            where: { id },
            relations: ['centers', 'instructorProfiles']
        });
        
        if (!user) {
            throw new NotFoundException('사용자를 찾을 수 없습니다.');
        }

        // 제재 이력 조회
        const sanctions = await this.sanctionRepository.find({
            where: { userId: id },
            order: { createdAt: 'DESC' }
        });

        // 최근 접속 이력 (최근 5건)
        const accessLogs = await this.accessLogRepository.find({
            where: { userId: id },
            order: { createdAt: 'DESC' },
            take: 5
        });

        // 게시물 통계
        const totalJobs = await this.jobRepository.count({ where: { userId: id } });
        const activeJobs = await this.jobRepository.count({ where: { userId: id, status: 'active' } });
        const deletedJobs = await this.jobRepository.count({ where: { userId: id, status: 'deleted' } });

        // 채팅 통계 (참여하거나 생성한 채팅방)
        const chatRoomsCount = await this.chatRoomRepository.count({
            where: [{ instructorId: id }, { centerId: id }]
        });

        // 신고 통계
        const receivedReportsCount = await this.reportRepository.count({
            where: { targetAuthorId: id }
        });
        const madeReportsCount = await this.reportRepository.count({
            where: { reporterId: id }
        });

        return {
            basic: {
                id: user.id,
                nickname: user.nickname || user.name || '이름없음',
                email: user.email || user.username || '-',
                phone: user.phone || '-',
                createdAt: user.createdAt,
                lastLoginAt: user.lastLoginAt,
                provider: user.provider || 'local',
                role: user.role,
                accessHistory: accessLogs.map(log => ({
                    id: log.id,
                    date: log.createdAt,
                    ip: log.ip,
                    userAgent: log.userAgent
                }))
            },
            sanction: {
                status: user.status || 'ACTIVE',
                sanctionCount: user.sanctionCount || 0,
                history: sanctions.map(s => ({
                    id: s.id,
                    date: s.createdAt,
                    type: s.type,
                    reason: s.reason,
                    adminMemo: s.adminMemo,
                    duration: s.durationDays ? `${s.durationDays}일` : '영구/경고'
                }))
            },
            activity: {
                posts: {
                    total: totalJobs,
                    active: activeJobs,
                    deleted: deletedJobs
                },
                chat: {
                    roomsCount: chatRoomsCount,
                    reportedCount: 0 // 채팅 개별 신고는 나중에 구현
                },
                reports: {
                    receivedCount: receivedReportsCount,
                    madeCount: madeReportsCount
                }
            }
        };
    }

    async getAccessLogs() {
        const logs = await this.accessLogRepository.find({
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: 200
        });

        return logs.map(log => ({
            id: log.id,
            userId: log.userId,
            userNickname: log.user?.nickname || log.user?.name || '알 수 없음',
            userEmail: log.user?.email || '-',
            ip: log.ip || 'Local',
            userAgent: log.userAgent || '-',
            createdAt: log.createdAt
        }));
    }

    async getJobs() {
        return this.jobRepository.find({
            where: { status: Not('deleted') },
            order: { createdAt: 'DESC' },
            take: 20
        });
    }

    async deleteJob(id: number) {
        const job = await this.jobRepository.findOne({ where: { id } });
        if (!job || job.status === 'deleted') {
            throw new NotFoundException('Job not found');
        }

        job.status = 'deleted';
        await this.jobRepository.save(job);
        await this.applicationRepository.update({ jobId: id }, { status: 'closed' });
        await this.favoriteRepository.delete({ jobId: id });

        return { ok: true, id };
    }

    async deleteJobsBulk(ids: number[]) {
        for (const id of ids) {
            const job = await this.jobRepository.findOne({ where: { id } });
            if (job && job.status !== 'deleted') {
                job.status = 'deleted';
                await this.jobRepository.save(job);
                await this.applicationRepository.update({ jobId: id }, { status: 'closed' });
                await this.favoriteRepository.delete({ jobId: id });
            }
        }
        return { ok: true, count: ids.length };
    }
}
