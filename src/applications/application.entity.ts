import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';
import { InstructorProfile } from '../profiles/instructor-profile.entity';

@Entity()
@Unique(['userId', 'jobId'])
export class Application {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 'submitted' })
    status: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @ManyToOne(() => Job, (job) => job.applications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'jobId' })
    job: Job;

    @Column()
    jobId: number;

    @ManyToOne(() => InstructorProfile, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'instructorProfileId' })
    instructorProfile: InstructorProfile;

    @Column({ nullable: true })
    instructorProfileId: number;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ type: 'simple-json', nullable: true })
    profileSnapshot: any;

    @Column({ default: false })
    isViewed: boolean;

    @Column({ type: 'timestamp', nullable: true })
    viewedAt: Date;

    @Column({ type: 'text', nullable: true })
    cancelReason: string;

    @Column({ type: 'text', nullable: true })
    cancelReasonDetail: string;


    @CreateDateColumn()

    createdAt: Date;
}
