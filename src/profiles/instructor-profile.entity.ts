import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('instructor_profile')
@Index(['userId'])
export class InstructorProfile {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ type: 'enum', enum: ['sub', 'regular'] })
    type: 'sub' | 'regular';

    @Column({ name: 'is_primary', type: 'tinyint', width: 1, default: 0 })
    isPrimary: boolean;

    @Column({ nullable: true })
    title: string | null;

    @Column({ nullable: true })
    intro: string | null;

    @Column({ nullable: true })
    experience: string | null;

    @Column({ nullable: true })
    specialty: string | null;

    // sub 전용
    @Column({ type: 'text', nullable: true })
    message: string | null;

    @Column({ name: 'resume_url', type: 'text', nullable: true })
    resumeUrl: string | null;

    @Column({ name: 'activity_url', type: 'text', nullable: true })
    activityUrl: string | null;

    // regular 전용
    @Column({ name: 'detail_intro', type: 'text', nullable: true })
    detailIntro: string | null;

    @Column({ name: 'pdf_url', type: 'text', nullable: true })
    pdfUrl: string | null;

    @Column({ name: 'portfolio_url', type: 'text', nullable: true })
    portfolioUrl: string | null;

    @ManyToOne(() => User, (user) => user.instructorProfiles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
