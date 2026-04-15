import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { InstructorProfile } from '../profiles/instructor-profile.entity';
import { Job } from '../jobs/job.entity';

import { Favorite } from '../favorites/favorite.entity';
import { Center } from '../centers/center.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar', { length: 255, unique: true, nullable: true })
    username: string | null;

    @Column('varchar', { length: 255, nullable: true })
    password: string | null;

    @Column('varchar', { length: 255, nullable: true })
    nickname: string | null;

    @Column('varchar', { length: 255, unique: true, nullable: true })
    providerId: string | null;

    @Column('varchar', { length: 255, nullable: true })
    provider: string | null; // 'kakao' | 'naver' | 'local'

    @Column('varchar', { length: 255, nullable: true })
    name: string | null;

    @Column('varchar', { length: 255, nullable: true })
    email: string | null;

    @Column('varchar', { length: 255, nullable: true })
    phone: string | null;

    @Column({ default: false })
    marketingAgree: boolean;

    @Column('text', { nullable: true })
    profileImage: string | null;

    @Column('varchar', { length: 255, nullable: true })
    hashedRefreshToken: string | null;

    @Column({ default: false })
    isEmailVerified: boolean;

    @Column('varchar', { length: 6, nullable: true })
    emailVerificationCode: string | null;

    @Column('timestamp', { nullable: true })
    emailVerifiedAt: Date | null;

    @OneToMany(() => InstructorProfile, (profile) => profile.user)
    instructorProfiles: InstructorProfile[];

    @OneToMany(() => Job, (job) => job.user)
    jobs: Job[];

    @OneToMany(() => Favorite, (fav) => fav.user)
    favorites: Favorite[];

    @OneToMany(() => Center, (center) => center.user)
    centers: Center[];

    @Column({ default: 'USER' })
    role: string; // 'USER', 'ADMIN'

    @CreateDateColumn()
    createdAt: Date;
}
