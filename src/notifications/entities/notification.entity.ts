import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/user.entity';

export enum NotificationType {
    APPLY_SUBMITTED = 'APPLY_SUBMITTED',
    APPLICATION_VIEWED = 'APPLICATION_VIEWED',
    JOB_CLOSED = 'JOB_CLOSED',
    JOB_UPDATED = 'JOB_UPDATED',
    CHAT_RECEIVED = 'CHAT_RECEIVED',
    FAVORITE_JOB_CLOSED = 'FAVORITE_JOB_CLOSED',
    FAVORITE_JOB_UPDATED = 'FAVORITE_JOB_UPDATED',
    FULLTIME_DDAY_REMINDER = 'FULLTIME_DDAY_REMINDER',
    JOB_CLOSING_SOON = 'JOB_CLOSING_SOON',
    NEW_APPLICATION = 'NEW_APPLICATION',
    APPLICATION_CANCELED = 'APPLICATION_CANCELED',
    APPLICATION_ACCEPTED = 'APPLICATION_ACCEPTED',
}

export function shouldSendPush(type: NotificationType): boolean {
    const pushTypes = [
        NotificationType.CHAT_RECEIVED,
        NotificationType.NEW_APPLICATION,
        NotificationType.APPLICATION_ACCEPTED,
        NotificationType.APPLICATION_CANCELED,
        NotificationType.JOB_CLOSED,
    ];
    return pushTypes.includes(type);
}

@Entity('notification')
@Index(['receiverUserId', 'isRead'])
@Index(['receiverUserId', 'createdAt'])
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    receiverUserId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'receiverUserId' })
    receiver: User;

    @Column({ type: 'enum', enum: NotificationType })
    type: NotificationType;

    @Column()
    title: string;

    @Column()
    body: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    deepLink: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    resourceType: string | null; // JOB, APPLICATION, CHAT 등

    @Column({ type: 'int', nullable: true })
    resourceId: number | null;

    @Column({ default: false })
    isRead: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date | null;
}
