import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Application } from '../applications/application.entity';
import { Center } from '../centers/center.entity';

@Entity()
export class Job {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    category: string;

    @Column()
    type: string;

    @Column()
    title: string;

    @Column()
    studio: string;

    @Column({ nullable: true })
    location: string; // 지역 (구 단위)

    @Column({ nullable: true })
    address: string; // 상세 주소

    @Column({ nullable: true })
    addressDetail: string; // 아주 구체적인 주소

    @Column({ nullable: true })
    regionTab: string; // 지역 탭 (서울/경기 등)

    @Column({ nullable: true })
    time: string; // 통합 시간 표시용

    @Column({ nullable: true })
    workTime: string; // 오전/오후/종일

    @Column({ nullable: true })
    workTimeNote: string; // 시간 상세 메모

    @Column({ type: 'simple-array', nullable: true })
    days: string[];

    @Column({ type: 'simple-array', nullable: true })
    daysOfWeek: string[];

    @Column()
    pay: string;

    @Column({ nullable: true })
    payDate: string; // 입금일

    @Column({ default: false })
    taxDeduction: boolean; // 3.3% 세금 공제 여부

    @Column({ nullable: true })
    companyName: string; // 업체명(사업자명)

    @Column({ nullable: true })
    phone: string; // 센터 연락처

    @Column({ type: 'simple-array', nullable: true })
    equipment: string[]; // 사용기구 배열

    @ManyToOne(() => Center, (center) => center.jobs, { nullable: true })
    @JoinColumn({ name: 'centerId' })
    center: Center;

    @Column({ nullable: true })
    centerId: number;

    @Column({ type: 'varchar', nullable: true })
    centerTempName: string;

    @Column({ type: 'varchar', nullable: true })
    centerTempBusinessName: string;

    @Column({ type: 'varchar', nullable: true })
    centerTempAddress: string;

    @Column({ type: 'varchar', nullable: true })
    centerTempAddressDetail: string;

    @Column({ type: 'varchar', nullable: true })
    centerTempPhone: string;

    @Column({ type: 'text', nullable: true })
    centerTempEquipment: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ default: 'active' })
    status: string;

    @Column({ default: 0 })
    views: number;

    @Column({ type: 'datetime', nullable: true })
    endAt: Date;

    @ManyToOne(() => User, (user) => user.jobs, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ nullable: true })
    userId: number;

    @OneToMany(() => Application, (application) => application.job)
    applications: Application[];

    @CreateDateColumn()
    createdAt: Date;
}
