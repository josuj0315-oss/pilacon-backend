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

    @Column({ nullable: true })
    deepLink: string | null;

    @Column({ nullable: true })
    resourceType: string | null; // JOB, APPLICATION, CHAT 등

    @Column({ nullable: true })
    resourceId: number | null;

    @Column({ default: false })
    isRead: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ nullable: true })
    readAt: Date | null;
}
