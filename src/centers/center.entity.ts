import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

@Entity('centers')
export class Center {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, (user) => user.centers)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @Column()
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    businessName: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    address: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    addressDetail: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    phone: string;

    @Column({ type: 'simple-array', nullable: true })
    equipment: string[];

    @Column({ default: false })
    isDefault: boolean;

    @Column({ default: false })
    isDeleted: boolean;

    @OneToMany(() => Job, (job) => job.center)
    jobs: Job[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
