import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity('notification_setting')
export class NotificationSetting {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    userId: number;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ default: true })
    allowApplyReceived: boolean;

    @Column({ default: true })
    allowJobClosed: boolean;

    @Column({ default: true })
    allowStatusChanged: boolean;

    @Column({ default: false })
    allowMatchingJob: boolean;

    @Column({ type: 'time', nullable: true })
    quietHoursStart: string;

    @Column({ type: 'time', nullable: true })
    quietHoursEnd: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
