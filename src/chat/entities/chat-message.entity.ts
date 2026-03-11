import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ChatRoom } from './chat-room.entity';
import { User } from '../../users/user.entity';

@Entity('chat_message')
export class ChatMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => ChatRoom, (room) => room.messages, { onDelete: 'CASCADE' })
    @Index()
    @JoinColumn({ name: 'roomId' })
    room: ChatRoom;

    @Column()
    roomId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'senderUserId' })
    sender: User;

    @Column()
    senderUserId: number;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'varchar', default: 'text' })
    type: string;

    @Column({ type: 'varchar', nullable: true })
    imageUrl: string;

    @Column({ type: 'varchar', nullable: true })
    imageKey: string;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
