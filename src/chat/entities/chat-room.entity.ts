import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { Application } from '../../applications/application.entity';
import { Job } from '../../jobs/job.entity';
import { User } from '../../users/user.entity';
import { ChatParticipant } from './chat-participant.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_room')
@Unique(['instructorId', 'centerId'])
export class ChatRoom {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    applicationId: number;

    @OneToOne(() => Application, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'applicationId' })
    application: Application;

    @Column()
    jobId: number;

    @ManyToOne(() => Job, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'jobId' })
    job: Job;

    @Column({ type: 'int', nullable: true })
    instructorId: number | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'instructorId' })
    instructor: User | null;

    @Column({ type: 'int', nullable: true })
    centerId: number | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'centerId' })
    center: User | null;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    lastMessageAt: Date | null;

    @OneToMany(() => ChatParticipant, (participant) => participant.room)
    participants: ChatParticipant[];

    @OneToMany(() => ChatMessage, (message) => message.room)
    messages: ChatMessage[];
}
