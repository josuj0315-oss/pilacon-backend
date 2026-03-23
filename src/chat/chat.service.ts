import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { Application } from '../applications/application.entity';
import { Job } from '../jobs/job.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatRoom)
        private roomRepository: Repository<ChatRoom>,
        @InjectRepository(ChatParticipant)
        private participantRepository: Repository<ChatParticipant>,
        @InjectRepository(ChatMessage)
        private messageRepository: Repository<ChatMessage>,
        @InjectRepository(Application)
        private applicationRepository: Repository<Application>,
        private notificationsService: NotificationsService,
    ) { }

    async getOrCreateRoom(userId: number, applicationId: number) {
        // 1. application 및 job 조회
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: ['job'],
        });

        if (!application) {
            throw new NotFoundException('해당 지원 내역을 찾을 수 없습니다.');
        }

        const job = application.job;
        if (!job) {
            throw new NotFoundException('연결된 공고를 찾을 수 없습니다.');
        }

        // 2. 권한 체크
        const isInstructor = application.userId === userId;
        const isCenter = job.userId === userId;

        if (!isInstructor && !isCenter) {
            throw new ForbiddenException('채팅방에 접근할 권한이 없습니다.');
        }

        // 3. 기존 방 확인 (참여자 조합으로 확인)
        const instructorId = application.userId;
        const centerId = job.userId;

        if (!instructorId || !centerId) {
            throw new NotFoundException('참여자 정보를 찾을 수 없습니다.');
        }

        let room = await this.roomRepository.findOne({
            where: { instructorId, centerId },
        });

        // 기존에 생성된 방들 중 instructorId/centerId가 세팅 안된 경우 대비 (하위 호환)
        if (!room) {
            const legacyRoom = await this.roomRepository.createQueryBuilder('room')
                .innerJoin('room.participants', 'p1')
                .innerJoin('room.participants', 'p2')
                .where('p1.userId = :instructorId', { instructorId })
                .andWhere('p2.userId = :centerId', { centerId })
                .getOne();

            if (legacyRoom) {
                room = legacyRoom;
                // 새 컬럼 업데이트
                await this.roomRepository.update(room.id, { instructorId, centerId });
            }
        }

        if (room) {
            return room;
        }

        // 4. 방 생성 및 참여자 등록
        const newRoom = this.roomRepository.create({
            applicationId: application.id,
            jobId: job.id,
            instructorId,
            centerId,
        });
        const savedRoom = await this.roomRepository.save(newRoom);

        // 참가자 생성
        const participants = [
            this.participantRepository.create({
                roomId: savedRoom.id,
                userId: centerId,
                role: 'center',
            }),
            this.participantRepository.create({
                roomId: savedRoom.id,
                userId: instructorId,
                role: 'instructor',
            }),
        ];
        await this.participantRepository.save(participants);
        return savedRoom;
    }

    async getMyRooms(userId: number) {
        const participations = await this.participantRepository.find({
            where: { userId },
            relations: ['room', 'room.participants', 'room.participants.user', 'room.job', 'room.application'],
        });

        // 방 목록과 함께 상대방 정보, 마지막 메시지 등을 구성해서 반환
        const rooms = await Promise.all(participations.map(async (p) => {
            const room = p.room;
            const otherParticipant = room.participants.find(part => part.userId !== userId);
            const lastMessage = await this.messageRepository.findOne({
                where: { roomId: room.id },
                order: { createdAt: 'DESC' },
            });

            return {
                id: room.id,
                job: room.job,
                application: room.application,
                otherUser: otherParticipant?.user,
                lastMessage,
                updatedAt: room.lastMessageAt || room.createdAt,
            };
        }));

        return rooms.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async getRoomMessages(userId: number, roomId: number) {
        // 참여 여부 확인
        const participant = await this.participantRepository.findOne({
            where: { roomId, userId },
        });

        if (!participant) {
            throw new ForbiddenException('해당 채팅방의 메시지를 볼 수 없습니다.');
        }

        return this.messageRepository.find({
            where: { roomId },
            relations: ['sender'],
            order: { createdAt: 'ASC' },
        });
    }

    async sendMessage(userId: number, roomId: number, content: string, type: string = 'text', imageUrl?: string, imageKey?: string) {
        const participant = await this.participantRepository.findOne({
            where: { roomId, userId },
        });

        if (!participant) {
            throw new ForbiddenException('메시지를 보낼 권한이 없습니다.');
        }

        const message = this.messageRepository.create({
            roomId,
            senderUserId: userId,
            content,
            type,
            imageUrl,
            imageKey,
        });

        const savedMessage = await this.messageRepository.save(message);

        // 방의 마지막 메시지 시간 업데이트
        await this.roomRepository.update(roomId, {
            lastMessageAt: savedMessage.createdAt,
        });

        // 알림 발송: 상대방에게 CHAT_RECEIVED
        try {
            const participants = await this.participantRepository.find({
                where: { roomId },
                relations: ['user']
            });
            const otherParticipant = participants.find(p => p.userId !== userId);

            if (otherParticipant) {
                const sender = await this.participantRepository.manager.findOne('User', { where: { id: userId } }) as any;
                await this.notificationsService.createNotification({
                    receiverUserId: otherParticipant.userId,
                    type: NotificationType.CHAT_RECEIVED,
                    title: '새로운 메시지',
                    body: type === 'image' ? `${sender?.nickname || '회원'}님이 이미지를 보냈습니다.` : `${sender?.nickname || '회원'}님: ${content.length > 20 ? content.slice(0, 20) + '...' : content}`,
                    deepLink: `/chat/${roomId}`,
                    resourceType: 'CHAT',
                    resourceId: roomId,
                });
            }
        } catch (e) {
            console.error('Failed to send chat notification:', e);
        }

        return savedMessage;
    }
}
