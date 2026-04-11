import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Notice } from '../notice/notice.entity';

export enum PopupType {
  CUSTOM = 'CUSTOM',
  NOTICE = 'NOTICE',
}

@Entity('popups')
export class Popup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: PopupType,
    default: PopupType.CUSTOM,
  })
  type: PopupType;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  noticeId: number;

  @ManyToOne(() => Notice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'noticeId' })
  notice: Notice;

  @Column({ type: 'timestamp', nullable: true })
  startAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
