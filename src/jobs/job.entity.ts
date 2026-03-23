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
    location: string | null; // 지역 (구 단위)

    @Column({ nullable: true })
    address: string | null; // 상세 주소

    @Column({ nullable: true })
    addressDetail: string | null; // 아주 구체적인 주소

    @Column({ nullable: true })
    regionTab: string | null; // 지역 탭 (서울/경기 등)

    @Column({ nullable: true })
    time: string | null; // 통합 시간 표시용

    @Column({ nullable: true })
    workTime: string | null; // 오전/오후/종일

    @Column({ nullable: true })
    workTimeNote: string | null; // 시간 상세 메모

    @Column({ type: 'simple-array', nullable: true })
    days: string[] | null;

    @Column({ type: 'simple-array', nullable: true })
    daysOfWeek: string[] | null;

    @Column()
    pay: string;

    @Column({ nullable: true })
    payDate: string | null; // 입금일

    @Column({ default: false })
    taxDeduction: boolean; // 3.3% 세금 공제 여부

    @Column({ nullable: true })
    companyName: string | null; // 업체명(사업자명)

    @Column({ nullable: true })
    phone: string | null; // 센터 연락처

    @Column({ type: 'simple-array', nullable: true })
    equipment: string[] | null; // 사용기구 배열

    @ManyToOne(() => Center, (center) => center.jobs, { nullable: true })
    @JoinColumn({ name: 'centerId' })
    center: Center | null;

    @Column({ nullable: true })
    centerId: number | null;

    @Column({ type: 'varchar', nullable: true })
    centerTempName: string | null;

    @Column({ type: 'varchar', nullable: true })
    centerTempBusinessName: string | null;

    @Column({ type: 'varchar', nullable: true })
    centerTempAddress: string | null;

    @Column({ type: 'varchar', nullable: true })
    centerTempAddressDetail: string | null;

    @Column({ type: 'varchar', nullable: true })
    centerTempPhone: string | null;

    @Column({ type: 'text', nullable: true })
    centerTempEquipment: string | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ default: 'active' })
    status: string;

    @Column({ default: 0 })
    views: number;

    @Column({ type: 'datetime', nullable: true })
    endAt: Date | null;

    @ManyToOne(() => User, (user) => user.jobs, { nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User | null;

    @Column({ nullable: true })
    userId: number | null;

    @OneToMany(() => Application, (application) => application.job)
    applications: Application[];

    @CreateDateColumn()
    createdAt: Date;
}
