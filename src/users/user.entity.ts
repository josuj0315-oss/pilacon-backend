import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { InstructorProfile } from '../profiles/instructor-profile.entity';
import { Job } from '../jobs/job.entity';

import { Favorite } from '../favorites/favorite.entity';
import { Center } from '../centers/center.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    username: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    password: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    nickname: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    socialId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider: string; // 'kakao' | 'naver' | 'local'

    @Column({ type: 'varchar', length: 255, nullable: true })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    phone: string;

    @Column({ default: false })
    marketingAgree: boolean;

    @Column({ type: 'text', nullable: true })
    profileImage: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    hashedRefreshToken: string;

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
