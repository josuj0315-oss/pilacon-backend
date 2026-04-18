import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Notification, NotificationType, shouldSendPush } from './entities/notification.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import { Subject, Observable, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MessageEvent } from '@nestjs/common';

interface NotificationEvent {
    receiverUserId: number;
    data: Notification;
}

type NotificationSettingUpdate = DeepPartial<NotificationSetting>;

@Injectable()
export class NotificationsService {
    private notificationSubject = new Subject<NotificationEvent>();

    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
        @InjectRepository(NotificationSetting)
        private settingRepository: Repository<NotificationSetting>,
    ) { }

    // SSE 스트림
    eventStream(userId: number): Observable<MessageEvent> {
        const notification$ = this.notificationSubject.asObservable().pipe(
            filter(event => event.receiverUserId === userId),
            map(event => ({ data: event.data }))
        );

        const heartbeat$ = interval(25000).pipe(
            map(() => ({ type: 'heartbeat', data: { ok: true } } as MessageEvent))
        );

        return merge(notification$, heartbeat$);
    }

    async createNotification(params: {
        receiverUserId: number;
        type: NotificationType;
        title: string;
        body: string;
        deepLink?: string;
        resourceType?: string;
        resourceId?: number;
    }) {
        const notification = this.notificationRepository.create(params);
        const saved = await this.notificationRepository.save(notification);

        // SSE 전송 (In-App real-time)
        this.notificationSubject.next({ receiverUserId: params.receiverUserId, data: saved });

        // 푸시 알림 발송 (Filter & Send)
        if (shouldSendPush(params.type)) {
            await this.sendPushNotification(params.receiverUserId, params.title, params.body, {
                type: params.type,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                deepLink: params.deepLink,
            });
        }

        return saved;
    }

    private async sendPushNotification(userId: number, title: string, body: string, data?: any) {
        // [TODO] FCM 또는 OneSignal SDK 연동 필요
        // 현재는 기준 정리를 위해 로그로 대체
        console.log(`[PUSH SENT] To User(${userId}): [${title}] ${body}`, data);
    }

    async getNotifications(userId: number, page = 1, limit = 20) {
        const [items, total] = await this.notificationRepository.findAndCount({
            where: { receiverUserId: userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: (page - 1) * limit,
        });

        return { items, total, page, limit };
    }

    async markAsRead(userId: number, id: number) {
        const notification = await this.notificationRepository.findOne({
            where: { id, receiverUserId: userId }
        });
        if (!notification) throw new NotFoundException('알림을 찾을 수 없습니다.');

        notification.isRead = true;
        notification.readAt = new Date();
        return this.notificationRepository.save(notification);
    }

    async markAllAsRead(userId: number) {
        await this.notificationRepository.update(
            { receiverUserId: userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
        return { success: true };
    }

    async getUnreadCount(userId: number) {
        return this.notificationRepository.count({
            where: { receiverUserId: userId, isRead: false }
        });
    }

    async getSettings(userId: number): Promise<NotificationSetting> {
        let setting = await this.settingRepository.findOne({ where: { userId } });
        if (!setting) {
            setting = this.settingRepository.create({
                userId,
                settings: {
                    posts: {
                        regions: [],
                        workouts: [],
                        employmentTypes: [],
                        newJob: false,
                        deadline: false,
                        closed: false
                    }
                }
            });
            await this.settingRepository.save(setting);
        }
        // Ensure settings structure exists even if record exists but settings is null
        if (!setting.settings) {
            setting.settings = {
                posts: {
                    regions: [],
                    workouts: [],
                    employmentTypes: [],
                    newJob: false,
                    deadline: false,
                    closed: false
                }
            };
        }
        return setting;
    }

    async updateSettings(userId: number, updateData: NotificationSettingUpdate): Promise<NotificationSetting> {
        let setting: NotificationSetting | null = await this.settingRepository.findOne({ where: { userId } });
        if (!setting) {
            setting = this.settingRepository.create({ userId } as NotificationSettingUpdate);
        }
        const merged: NotificationSetting = this.settingRepository.merge(setting, updateData);
        return await this.settingRepository.save(merged);
    }
}
