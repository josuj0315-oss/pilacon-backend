import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../users/user.entity';

@Entity('chat_participant')
@Unique(['room', 'user'])
export class ChatParticipant {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => ChatRoom, (room) => room.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'roomId' })
    room: ChatRoom;

    @Column()
    roomId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @Column({ nullable: true })
    role: string; // 'center' | 'instructor'

    @CreateDateColumn()
    joinedAt: Date;
}
