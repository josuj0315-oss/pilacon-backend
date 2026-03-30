import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, LessThan, Not, Between } from 'typeorm';
import { Job } from './job.entity';
import { Application } from '../applications/application.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, Notification } from '../notifications/entities/notification.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatRoom } from '../chat/entities/chat-room.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { ChatParticipant } from '../chat/entities/chat-participant.entity';
import { Favorite } from '../favorites/favorite.entity';

@Injectable()
export class JobsService {
    constructor(
        @InjectRepository(Job)
        private jobsRepository: Repository<Job>,
        @InjectRepository(Application)
        private applicationRepository: Repository<Application>,
        @InjectRepository(Favorite)
        private favoriteRepository: Repository<Favorite>,
        private notificationsService: NotificationsService,
        private dataSource: DataSource,
    ) { }

    async findAll(): Promise<Job[]> {
        return this.jobsRepository.find({
            where: { status: Not('deleted') },
            relations: ['user', 'center'],
            order: {
                status: 'ASC', // 'active' < 'closed' (alphabetical order works here)
                createdAt: 'DESC',
            },
        });
    }

    async findOne(id: number): Promise<Job | null> {
        const job = await this.jobsRepository.findOne({
            where: { id },
            relations: ['user', 'center'],
        });
        if (job) {
            if (job.status === 'deleted') {
                throw new NotFoundException('Deleted job');
            }
            job.views = (job.views || 0) + 1;
            await this.jobsRepository.save(job);
        }
        return job;
    }

    async create(userId: number, jobData: Partial<Job>): Promise<Job> {
        if (jobData.centerId) {
            jobData.centerTempName = null as any;
            jobData.centerTempBusinessName = null as any;
            jobData.centerTempAddress = null as any;
            jobData.centerTempAddressDetail = null as any;
            jobData.centerTempPhone = null as any;
            jobData.centerTempEquipment = null as any;
        } else if (!jobData.centerTempName) {
            jobData.centerTempName = '미등록 센터';
        }

        const newJob = this.jobsRepository.create({
            ...jobData,
            userId,
        });
        const saved = await this.jobsRepository.save(newJob);
        const result = await this.findOne(saved.id);
        if (!result) throw new Error('Failed to create and reload job');
        return result;
    }

    async update(id: number, userId: number, jobData: Partial<Job>): Promise<Job> {
        const job = await this.jobsRepository.findOne({ where: { id, userId } });
        if (!job) {
            throw new NotFoundException('Job not found or unauthorized');
        }

        // Whitelist updates
        const allowedFields = [
            'category', 'type', 'title', 'studio', 'location', 'address', 'addressDetail',
            'regionTab', 'time', 'workTime', 'workTimeNote', 'days',
            'pay', 'payDate', 'taxDeduction', 'companyName', 'phone',
            'equipment', 'description', 'status', 'endAt', 'daysOfWeek',
            'centerId', 'centerTempName', 'centerTempBusinessName',
            'centerTempAddress', 'centerTempAddressDetail', 'centerTempPhone', 'centerTempEquipment'
        ];

        let isMajorChange = false;
        const majorFields = ['title', 'time', 'workTime', 'days', 'pay', 'payDate'];

        Object.keys(jobData).forEach(key => {
            if (allowedFields.includes(key)) {
                if (majorFields.includes(key) && job[key] !== jobData[key]) {
                    isMajorChange = true;
                }
                job[key] = jobData[key];
            }
        });

        if (job.centerId) {
            job.centerTempName = null as any;
            job.centerTempBusinessName = null as any;
            job.centerTempAddress = null as any;
            job.centerTempAddressDetail = null as any;
            job.centerTempPhone = null as any;
            job.centerTempEquipment = null as any;
        } else if (!job.centerTempName) {
            job.centerTempName = '미등록 센터';
        }

        const saved = await this.jobsRepository.save(job);

        const result = await this.findOne(saved.id);
        if (!result) throw new Error('Failed to reload job');

        if (isMajorChange) {
            await this.handleJobUpdatedNotifications(result);
        }

        return result;
    }

    async remove(id: number, userId: number): Promise<void> {
        const job = await this.jobsRepository.findOne({ where: { id, userId } });
        if (!job) {
            throw new NotFoundException('Job not found or unauthorized');
        }

        job.status = 'deleted';
        await this.jobsRepository.save(job);

        // 지원 상태 변경 (기존 closeJob 로직과 유사하게 처리)
        await this.applicationRepository.update({ jobId: id }, { status: 'closed' });
    }

    async closeJob(id: number, userId: number) {
        const job = await this.jobsRepository.findOne({ where: { id, userId } });
        if (!job) return null;

        job.status = 'CLOSED';
        const saved = await this.jobsRepository.save(job);

        // 1. 지원한 사람들의 상태를 'closed' (채용완료/마감)으로 변경
        await this.applicationRepository.update({ jobId: id }, { status: 'closed' });

        await this.handleJobClosedNotifications(saved);
        return saved;
    }

    private async handleJobClosedNotifications(job: Job) {
        // 1. 지원자들에게 알림 (JOB_CLOSED)
        const applications = await this.applicationRepository.find({
            where: { jobId: job.id },
            select: ['userId'],
        });
        const applicantIds = [...new Set(applications.map(a => a.userId))];

        for (const applicantId of applicantIds) {
            await this.notificationsService.createNotification({
                receiverUserId: applicantId,
                type: NotificationType.JOB_CLOSED,
                title: '지원한 공고 마감',
                body: `[${job.title}] 공고가 모집 완료되었습니다.`,
                deepLink: `/jobs/${job.id}`,
                resourceType: 'JOB',
                resourceId: job.id,
            });
        }

        // 2. 즐겨찾기 유저들에게 알림 (FAVORITE_JOB_CLOSED)
        const favorites = await this.favoriteRepository.find({
            where: { jobId: job.id },
            select: ['userId'],
        });
        const favoriteUserIds = [...new Set(favorites.map(f => f.userId))];

        for (const favUserId of favoriteUserIds) {
            if (applicantIds.includes(favUserId)) continue; // 이미 지원자 알림 받았으면 패스

            await this.notificationsService.createNotification({
                receiverUserId: favUserId,
                type: NotificationType.FAVORITE_JOB_CLOSED,
                title: '즐겨찾기 공고 마감',
                body: `[${job.studio}] 공고가 모집 완료되었습니다.`,
                deepLink: `/jobs/${job.id}`,
                resourceType: 'JOB',
                resourceId: job.id,
            });
        }
    }

    private async handleJobUpdatedNotifications(job: Job) {
        // 1. 지원자들에게 알림 (JOB_UPDATED)
        const applications = await this.applicationRepository.find({
            where: { jobId: job.id },
            select: ['userId'],
        });
        const applicantIds = [...new Set(applications.map(a => a.userId))];

        for (const applicantId of applicantIds) {
            await this.notificationsService.createNotification({
                receiverUserId: applicantId,
                type: NotificationType.JOB_UPDATED,
                title: '지원한 공고 내용 변경',
                body: `[${job.title}] 공고의 세부 정보(일정/급여 등)가 변경되었습니다.`,
                deepLink: `/jobs/${job.id}`,
                resourceType: 'JOB',
                resourceId: job.id,
            });
        }

        // 2. 즐겨찾기 유저들에게 알림 (FAVORITE_JOB_UPDATED)
        const favorites = await this.favoriteRepository.find({
            where: { jobId: job.id },
            select: ['userId'],
        });
        const favoriteUserIds = [...new Set(favorites.map(f => f.userId))];

        for (const favUserId of favoriteUserIds) {
            if (applicantIds.includes(favUserId)) continue;

            await this.notificationsService.createNotification({
                receiverUserId: favUserId,
                type: NotificationType.FAVORITE_JOB_UPDATED,
                title: '즐겨찾기 공고 내용 변경',
                body: `[${job.title}] 즐겨찾기한 공고의 내용이 변경되었습니다.`,
                deepLink: `/jobs/${job.id}`,
                resourceType: 'JOB',
                resourceId: job.id,
            });
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async handleDdayReminders() {
        const targetDays = [1, 3];
        for (const days of targetDays) {
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() + days);

            const endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);

            const closingJobs = await this.jobsRepository.find({
                where: {
                    status: Not('CLOSED'),
                    endAt: Between(startDate, endDate),
                },
            });

            for (const job of closingJobs) {
                // 1. 강사(지원자 및 즐겨찾기 유저)에게 알림
                const applicants = await this.applicationRepository.find({ where: { jobId: job.id }, select: ['userId'] });
                const favorites = await this.favoriteRepository.find({ where: { jobId: job.id }, select: ['userId'] });

                const applicantIds = applicants.map(a => a.userId);
                const combinedUserIds = [...new Set([...applicantIds, ...favorites.map(f => f.userId)])];

                const isFullTime = job.type.includes('정규직');
                const notificationType = isFullTime ? NotificationType.FULLTIME_DDAY_REMINDER : NotificationType.JOB_CLOSING_SOON;
                const title = isFullTime ? '정규직 채용 마감 임박' : '공고 마감 임박';
                const body = isFullTime
                    ? `[${job.studio}] 정규직 채용 마감 D-${days} 입니다.`
                    : `${days === 1 ? '내일' : days + '일 후'} 마감되는 공고가 있습니다: "${job.title}"`;

                for (const userId of combinedUserIds) {
                    await this.notificationsService.createNotification({
                        receiverUserId: userId,
                        type: notificationType,
                        title,
                        body: `[${job.studio}] ${body}`, // body already has some context but adding studio tag
                        deepLink: `/jobs/${job.id}`,
                        resourceType: 'JOB',
                        resourceId: job.id,
                    });
                }

                // 2. 매장(센터)에게 알림 (D-1만)
                if (days === 1 && job.userId) {
                    await this.notificationsService.createNotification({
                        receiverUserId: job.userId,
                        type: NotificationType.JOB_CLOSING_SOON,
                        title: '등록 공고 마감 예정',
                        body: `[${job.title}] 등록하신 공고가 내일 마감됩니다.`,
                        deepLink: `/activity/applicants/${job.id}`,
                        resourceType: 'JOB',
                        resourceId: job.id,
                    });
                }
            }
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async handleAutoClose() {
        const now = new Date();
        const expiredJobs = await this.jobsRepository.find({
            where: {
                status: Not('CLOSED'),
                endAt: LessThan(now),
            },
        });

        for (const job of expiredJobs) {
            job.status = 'CLOSED';
            const saved = await this.jobsRepository.save(job);

            // 지원 상태 변경
            await this.applicationRepository.update({ jobId: saved.id }, { status: 'closed' });

            // 알림 발송
            await this.handleJobClosedNotifications(saved);
        }
    }
}
