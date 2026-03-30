import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationSetting } from './entities/notification-setting.entity';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let repo: any;

    const mockRepo = {
        create: jest.fn().mockImplementation(dto => dto),
        save: jest.fn().mockImplementation(notification => Promise.resolve({ id: 1, ...notification })),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: getRepositoryToken(Notification),
                    useValue: mockRepo,
                },
                {
                    provide: getRepositoryToken(NotificationSetting),
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
        repo = module.get(getRepositoryToken(Notification));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('shouldSendPush', () => {
        it('should return true for CHAT_RECEIVED, NEW_APPLICATION, APPLICATION_ACCEPTED, APPLICATION_CANCELED, JOB_CLOSED', () => {
            const { shouldSendPush } = require('./entities/notification.entity');
            expect(shouldSendPush(NotificationType.CHAT_RECEIVED)).toBe(true);
            expect(shouldSendPush(NotificationType.NEW_APPLICATION)).toBe(true);
            expect(shouldSendPush(NotificationType.APPLICATION_ACCEPTED)).toBe(true);
            expect(shouldSendPush(NotificationType.APPLICATION_CANCELED)).toBe(true);
            expect(shouldSendPush(NotificationType.JOB_CLOSED)).toBe(true);
        });

        it('should return false for others', () => {
            const { shouldSendPush } = require('./entities/notification.entity');
            expect(shouldSendPush(NotificationType.APPLY_SUBMITTED)).toBe(false);
            expect(shouldSendPush(NotificationType.APPLICATION_VIEWED)).toBe(false);
            expect(shouldSendPush(NotificationType.JOB_UPDATED)).toBe(false);
        });
    });

    describe('createNotification', () => {
        it('should log push sent for NEW_APPLICATION', async () => {
            const spy = jest.spyOn(console, 'log').mockImplementation();
            await service.createNotification({
                receiverUserId: 1,
                type: NotificationType.NEW_APPLICATION,
                title: 'Test Title',
                body: 'Test Body',
            });
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('[PUSH SENT]'),
                expect.any(Object)
            );
            spy.mockRestore();
        });

        it('should NOT log push sent for APPLY_SUBMITTED', async () => {
            const spy = jest.spyOn(console, 'log').mockImplementation();
            await service.createNotification({
                receiverUserId: 1,
                type: NotificationType.APPLY_SUBMITTED,
                title: 'In-App Title',
                body: 'In-App Body',
            });
            expect(spy).not.toHaveBeenCalledWith(expect.stringContaining('[PUSH SENT]'), expect.any(Object));
            spy.mockRestore();
        });
    });
});
