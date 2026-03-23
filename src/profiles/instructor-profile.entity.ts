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

    @Column('varchar', { length: 255, nullable: true })
    title: string | null;

    @Column('varchar', { length: 255, nullable: true })
    intro: string | null;

    @Column('varchar', { length: 255, nullable: true })
    experience: string | null;

    @Column('varchar', { length: 255, nullable: true })
    specialty: string | null;

    // sub 전용
    @Column('text', { nullable: true })
    message: string | null;

    @Column('text', { name: 'resume_url', nullable: true })
    resumeUrl: string | null;

    @Column('text', { name: 'activity_url', nullable: true })
    activityUrl: string | null;

    // regular 전용
    @Column('text', { name: 'detail_intro', nullable: true })
    detailIntro: string | null;

    @Column('text', { name: 'pdf_url', nullable: true })
    pdfUrl: string | null;

    @Column('text', { name: 'portfolio_url', nullable: true })
    portfolioUrl: string | null;

    @ManyToOne(() => User, (user) => user.instructorProfiles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
