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
    username: string;

    @Column({ nullable: true })
    password: string;

    @Column({ nullable: true })
    nickname: string;

    @Column({ unique: true, nullable: true })
    socialId: string;

    @Column({ nullable: true })
    provider: string; // 'kakao' | 'naver' | 'local'

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ default: false })
    marketingAgree: boolean;

    @Column({ nullable: true })
    profileImage: string;

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
