import { Injectable, OnModuleInit, Logger, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';
import { Report } from '../reports/report.entity';
import { Admin } from './admin.entity';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService implements OnModuleInit {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        @InjectRepository(Admin) private adminRepository: Repository<Admin>,
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Job) private jobRepository: Repository<Job>,
        @InjectRepository(Report) private reportRepository: Repository<Report>,
        private jwtService: JwtService
    ) {}

    async onModuleInit() {
        await this.seedInitialAdmin();
    }

    private async seedInitialAdmin() {
        const adminUser = await this.adminRepository.findOne({ where: { username: 'admin' } });
        if (!adminUser) {
            this.logger.log('Seeding initial admin user into admins table: admin / admin1234');
            const hashedPassword = await bcrypt.hash('admin1234', 10);
            const newAdmin = this.adminRepository.create({
                username: 'admin',
                password: hashedPassword,
                nickname: '최고관리자',
            });
            await this.adminRepository.save(newAdmin);
        }
    }

    async createAdmin(details: any) {
        const { username, password, nickname } = details;
        const existing = await this.adminRepository.findOne({ where: { username } });
        if (existing) {
            throw new ConflictException('이미 사용 중인 관리자 아이디입니다.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = this.adminRepository.create({
            username,
            password: hashedPassword,
            nickname: nickname || '관리자',
        });
        await this.adminRepository.save(newAdmin);
        return { message: 'Admin created successfully' };
    }

    async login(details: any) {
        const { username, password } = details;
        const admin = await this.adminRepository.findOne({ where: { username } });

        if (!admin || !admin.password) {
            throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        const isPasswordMatching = await bcrypt.compare(password, admin.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        const payload = { sub: admin.id, isAdmin: true, username: admin.username };
        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '1d' });

        return { admin: { id: admin.id, username: admin.username, nickname: admin.nickname }, accessToken };
    }

    async getStats() {
        const instructorCount = await this.userRepository.count({ where: { role: 'INSTRUCTOR' } });
        const centerCount = await this.userRepository.count({ where: { role: 'CENTER' } });
        const totalJobs = await this.jobRepository.count({ where: { status: 'active' } });
        const pendingReports = await this.reportRepository.count({ where: { status: 'PENDING' as any } });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newUsersToday = await this.userRepository.count({
            where: { createdAt: MoreThanOrEqual(today) }
        });

        return {
            totalMembers: { instructor: instructorCount, center: centerCount },
            activeJobs: totalJobs,
            newUsersToday,
            pendingReports,
        };
    }

    async getRecentDashboard() {
        const recentUsers = await this.userRepository.find({
            order: { createdAt: 'DESC' },
            take: 5,
            select: ['id', 'name', 'nickname', 'createdAt']
        });

        const recentReports = await this.reportRepository.find({
            order: { createdAt: 'DESC' },
            take: 5
        });

        const recentJobs = await this.jobRepository.find({
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

    async getReports(status?: string) {
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
            const reporterDisplayName = r.reporter?.nickname || r.reporter?.name || r.reporter?.email || '알 수 없음';
            let targetTitle = r.targetSnapshotTitle || '정보 없음';
            let targetAuthorDisplayName = '알 수 없음';

            if (r.targetType === 'JOB' && r.targetId) {
                const job = await this.jobRepository.findOne({ 
                    where: { id: r.targetId }, 
                    relations: ['user', 'center'] 
                });
                if (job) {
                    targetTitle = r.targetSnapshotTitle || job.title;
                    targetAuthorDisplayName = job.center?.name || job.user?.nickname || job.user?.name || job.user?.email || '알 수 없음';
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
                reason: r.reasonCode,
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
            .take(50);

        if (search) {
            query.where('user.name LIKE :search', { search: `%${search}%` })
                 .orWhere('user.email LIKE :search', { search: `%${search}%` })
                 .orWhere('user.nickname LIKE :search', { search: `%${search}%` });
        }

        const users = await query.getMany();

        return users.map(u => ({
            id: u.id,
            name: u.name || u.nickname || '이름없음',
            email: u.email || u.username || '-',
            type: u.role || (u.centers && u.centers.length > 0 ? 'CENTER' : 'INSTRUCTOR'),
            status: 'ACTIVE',
            reportCount: 0,
            createdAt: u.createdAt
        }));
    }

    async getJobs() {
        return this.jobRepository.find({
            order: { createdAt: 'DESC' },
            take: 20
        });
    }
}
