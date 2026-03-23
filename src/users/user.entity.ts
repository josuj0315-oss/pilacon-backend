import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { InstructorProfile } from '../profiles/instructor-profile.entity';
import { Job } from '../jobs/job.entity';

import { Favorite } from '../favorites/favorite.entity';
import { Center } from '../centers/center.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, nullable: true })
    username: string | null;

    @Column({ nullable: true })
    password: string | null;

    @Column({ nullable: true })
    nickname: string | null;

    @Column({ unique: true, nullable: true })
    socialId: string | null;

    @Column({ nullable: true })
    provider: string | null; // 'kakao' | 'naver' | 'local'

    @Column({ nullable: true })
    name: string | null;

    @Column({ nullable: true })
    email: string | null;

    @Column({ nullable: true })
    phone: string | null;

    @Column({ default: false })
    marketingAgree: boolean;

    @Column({ nullable: true })
    profileImage: string | null;

    @Column({ type: 'varchar', nullable: true })
    hashedRefreshToken: string | null;

    @OneToMany(() => InstructorProfile, (profile) => profile.user)
    instructorProfiles: InstructorProfile[];

    @OneToMany(() => Job, (job) => job.user)
    jobs: Job[];

    @OneToMany(() => Favorite, (fav) => fav.user)
    favorites: Favorite[];

    @OneToMany(() => Center, (center) => center.user)
    centers: Center[];

    @CreateDateColumn()
    createdAt: Date;
}
