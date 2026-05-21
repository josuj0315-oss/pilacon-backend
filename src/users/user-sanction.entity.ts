import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_sanctions')
export class UserSanction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column()
  type: string; // 'WARNING', 'SUSPENSION_7', 'BAN'

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  adminMemo: string;

  @Column({ nullable: true })
  durationDays: number;

  @CreateDateColumn()
  createdAt: Date;
}
