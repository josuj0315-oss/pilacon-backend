import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../users/user.entity';
import { ReportTargetType, ReportReasonCode, ReportStatus, ReportActionResult } from './reports.enum';

@Entity('reports')
@Index(['reporterId', 'targetType', 'targetId'], { unique: true })
export class Report {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column()
  reporterId: number;

  @Column({
    type: 'enum',
    enum: ReportTargetType,
  })
  targetType: ReportTargetType;

  @Column()
  targetId: number;

  @Column({ nullable: true })
  targetSnapshotTitle: string;

  @Column({
    type: 'enum',
    enum: ReportReasonCode,
  })
  reasonCode: ReportReasonCode;

  @Column({ type: 'text', nullable: true })
  reasonDetail: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({
    type: 'enum',
    enum: ReportActionResult,
    default: ReportActionResult.NONE,
  })
  actionResult: ReportActionResult;

  @Column({ type: 'text', nullable: true })
  adminMemo: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processedById' })
  processedBy: User;

  @Column({ nullable: true })
  processedById: number;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
