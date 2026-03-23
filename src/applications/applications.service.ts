import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';
import { InstructorProfile } from '../profiles/instructor-profile.entity';
import { Job } from '../jobs/job.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ApplicationsService {
    constructor(
        @InjectRepository(Application)
        private applicationRepository: Repository<Application>,
        @InjectRepository(InstructorProfile)
        private profileRepository: Repository<InstructorProfile>,
        @InjectRepository(Job)
        private jobRepository: Repository<Job>,
        private notificationsService: NotificationsService,
    ) { }

    async apply(userId: number, jobId: number, instructorProfileId: number, message?: string) {
        const job = await this.jobRepository.findOneBy({ id: jobId });
        if (!job) {
            throw new NotFoundException('해당 공고가 존재하지 않습니다.');
        }

        if (job.userId === userId) {
            throw new BadRequestException('본인이 등록한 공고에는 지원할 수 없습니다.');
        }

        const profile = await this.profileRepository.findOneBy({ id: instructorProfileId, userId });
        if (!profile) {
            throw new BadRequestException('유효하지 않은 프로필입니다.');
        }

        const isSubJob = job.type === 'sub' || job.type === 'short' || job.type.includes('대타') || job.type.includes('급구');
        const requiredType = isSubJob ? 'sub' : 'regular';

        if (profile.type !== requiredType) {
            const typeLabel = requiredType === 'sub' ? '대타' : '정규직';
            throw new BadRequestException(`${typeLabel} 프로필로만 지원 가능합니다.`);
        }

        const existing = await this.applicationRepository.findOneBy({ userId, jobId });
        if (existing && existing.status !== 'canceled') {
            throw new ConflictException('이미 지원한 공고입니다.');
        }

        const profileSnapshot = {
            title: profile.title,
            intro: profile.intro,
            experience: profile.experience,
            specialty: profile.specialty,
            message: profile.message,
            resumeUrl: profile.resumeUrl,
            activityUrl: profile.activityUrl,
            detailIntro: profile.detailIntro,
            pdfUrl: profile.pdfUrl,
            portfolioUrl: profile.portfolioUrl,
            type: profile.type
        };

        let application: Application;
        if (existing) {
            // 재지원: 기존 지원 내역 업데이트
            application = existing;
            application.status = 'submitted';
            application.instructorProfileId = instructorProfileId;
            application.message = message || profile.message;
            application.profileSnapshot = profileSnapshot;
            application.isViewed = false;
            application.viewedAt = null;
            application.cancelReason = null;
            application.cancelReasonDetail = null;
            // 필요에 따라 createdAt을 현재 시간으로 업데이트
            application.createdAt = new Date();
        } else {
            application = this.applicationRepository.create({
                userId,
                jobId,
                instructorProfileId,
                message: message || profile.message,
                status: 'submitted',
                profileSnapshot: profileSnapshot
            });
        }

        const saved = await this.applicationRepository.save(application);

        // 알림 발송
        try {
            const applicantUser = await this.applicationRepository.manager.findOne('User', { where: { id: userId } }) as any;

            // 1. 강사(지원자)에게 지원 완료 알림
            await this.notificationsService.createNotification({
                receiverUserId: userId,
                type: NotificationType.APPLY_SUBMITTED,
                title: existing ? '재지원 완료' : '지원 완료',
                body: `"${job.title}" 공고에 ${existing ? '다시 ' : ''}지원이 완료되었습니다.`,
                deepLink: `/activity?view=appliedDetail&id=${saved.id}`,
                resourceType: 'APPLICATION',
                resourceId: saved.id,
            });

            // 2. 매장(센터)에게 신규 지원 알림
            if (job.userId) {
                await this.notificationsService.createNotification({
                    receiverUserId: job.userId,
                    type: NotificationType.NEW_APPLICATION,
                    title: '신규 지원자가 도착했어요!',
                    body: `${applicantUser?.nickname || '회원'}님이 "${job.title}"에 지원했습니다.`,
                    deepLink: `/activity/applicants/${job.id}`,
                    resourceType: 'APPLICATION',
                    resourceId: saved.id,
                });
            }
        } catch (e) {
            console.error('Failed to send apply notification:', e);
        }

        return this.findUnique(userId, saved.jobId);
    }

    async markAsViewed(applicationId: number, centerUserId: number) {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: ['job'],
        });

        if (!application) throw new NotFoundException('지원 내역을 찾을 수 없습니다.');
        if (application.job.userId !== centerUserId) return application; // 권한 없으면 조용히 리턴

        if (!application.isViewed) {
            application.isViewed = true;
            application.viewedAt = new Date();
            application.status = 'read';
            await this.applicationRepository.save(application);

            // 알림 발송: 강사에게 APPLICATION_VIEWED
            await this.notificationsService.createNotification({
                receiverUserId: application.userId,
                type: NotificationType.APPLICATION_VIEWED,
                title: '매장이 내 지원서를 확인했어요',
                body: `"${application.job.title}" 공고에 대한 지원서를 매장에서 확인했습니다.`,
                deepLink: `/activity?view=appliedDetail&id=${application.id}`,
                resourceType: 'APPLICATION',
                resourceId: application.id,
            });
        }
        return application;
    }

    async cancel(id: number, userId: number, reason: string, detail?: string) {
        const application = await this.applicationRepository.findOne({
            where: { id },
            relations: ['job', 'user'],
        });

        if (!application) throw new NotFoundException('지원 내역을 찾을 수 없습니다.');
        if (application.userId !== userId) throw new BadRequestException('취소 권한이 없습니다.');

        if (application.status === 'accepted') {
            throw new BadRequestException('채용확정된 지원서는 취소할 수 없습니다.');
        }

        application.status = 'canceled';
        application.cancelReason = reason;
        application.cancelReasonDetail = detail || null;

        const saved = await this.applicationRepository.save(application);

        // 알림 발송: 공고 담당자에게 취소 알림
        try {
            if (application.job.userId) {
                await this.notificationsService.createNotification({
                    receiverUserId: application.job.userId,
                    type: NotificationType.APPLICATION_CANCELED,
                    title: '지원이 취소되었습니다.',
                    body: `${application.user?.nickname || '지원자'}님이 "${application.job.title}" 공고에 대한 지원을 취소했습니다.`,
                    deepLink: `/activity/applicants/${application.job.id}?id=${application.id}`,
                    resourceType: 'APPLICATION',
                    resourceId: application.id,
                });
            }
        } catch (e) {
            console.error('Failed to send cancellation notification:', e);
        }

        return saved;
    }


    async accept(id: number, centerUserId: number) {
        const application = await this.applicationRepository.findOne({
            where: { id },
            relations: ['job', 'user'],
        });

        if (!application) throw new NotFoundException('지원 내역을 찾을 수 없습니다.');
        if (application.job.userId !== centerUserId) throw new BadRequestException('채용확정 권한이 없습니다.');

        if (application.status === 'accepted') {
            return application;
        }

        application.status = 'accepted';
        const saved = await this.applicationRepository.save(application);

        // 공고 마감 처리 (대타/단기일 경우)
        const job = application.job;
        const isSubJob = job.type === 'sub' || job.type === 'short' || job.type.includes('대타') || job.type.includes('급구');

        if (isSubJob && job.status !== 'closed') {
            job.status = 'closed';
            await this.jobRepository.save(job);
        }

        // 알림 발송: 지원자에게 채용확정 알림
        try {
            await this.notificationsService.createNotification({
                receiverUserId: application.userId,
                type: NotificationType.APPLICATION_ACCEPTED,
                title: '채용이 확정되었습니다!',
                body: `"${job.title}" 공고에 채용이 확정되었습니다. 축하드립니다!`,
                deepLink: `/activity?tab=applied&view=appliedDetail&id=${application.id}`,
                resourceType: 'APPLICATION',
                resourceId: application.id,
            });
        } catch (e) {
            console.error('Failed to send acceptance notification:', e);
        }

        return saved;
    }

    async findMyApplications(userId: number) {
        return this.applicationRepository.find({
            where: { userId },
            relations: ['job', 'instructorProfile', 'user'],
            order: { createdAt: 'DESC' },
        });
    }

    async findByJobId(jobId: number) {
        return this.applicationRepository.find({
            where: { jobId },
            relations: ['user', 'user.instructorProfiles', 'instructorProfile'],
            select: {
                id: true,
                status: true,
                userId: true,
                jobId: true,
                instructorProfileId: true,
                message: true,
                profileSnapshot: true,
                isViewed: true,
                viewedAt: true,
                cancelReason: true,
                cancelReasonDetail: true,
                createdAt: true,
            },
            order: { createdAt: 'DESC' },
        });
    }

    async findUnique(userId: number, jobId: number) {
        return this.applicationRepository.findOne({
            where: { userId, jobId },
            relations: ['job', 'instructorProfile', 'user'],
        });
    }
}
