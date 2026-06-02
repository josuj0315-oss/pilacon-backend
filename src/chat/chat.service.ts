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
import { UserBlock } from '../users/user-block.entity';

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
        @InjectRepository(UserBlock)
        private blockRepository: Repository<UserBlock>,
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

        // 3. 참여자 ID 확정
        const instructorId = application.userId;
        const centerId = job.userId;

        if (!instructorId || !centerId) {
            throw new NotFoundException('참여자 정보를 찾을 수 없습니다.');
        }

        // 4. 차단 여부 체크
        const block = await this.blockRepository.findOne({
            where: [
                { blockerId: instructorId, blockedId: centerId },
                { blockerId: centerId, blockedId: instructorId },
            ],
        });
        if (block) {
            throw new ForbiddenException('차단된 사용자와는 채팅할 수 없습니다.');
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

    async markAsRead(userId: number, roomId: number): Promise<void> {
        await this.participantRepository.update(
            { roomId, userId },
            { lastReadAt: new Date() },
        );
    }

    async getRoomMessages(userId: number, roomId: number) {
        const participants = await this.participantRepository.find({ where: { roomId } });
        const myParticipant = participants.find(p => p.userId === userId);

        if (!myParticipant) {
            throw new ForbiddenException('해당 채팅방의 메시지를 볼 수 없습니다.');
        }

        const otherParticipant = participants.find(p => p.userId !== userId);
        const otherLastReadAt = otherParticipant?.lastReadAt ?? null;

        const messages = await this.messageRepository.find({
            where: { roomId },
            relations: ['sender'],
            order: { createdAt: 'ASC' },
        });

        // 내가 차단한 유저의 메시지 필터링
        const myBlocks = await this.blockRepository.find({ where: { blockerId: userId } });
        const blockedIds = new Set(myBlocks.map(b => b.blockedId));

        return messages
            .filter(m => !blockedIds.has(m.senderUserId))
            .map(m => ({
                ...m,
                isRead: m.senderUserId === userId && otherLastReadAt
                    ? new Date(m.createdAt) <= new Date(otherLastReadAt)
                    : false,
            }));
    }

    async sendMessage(userId: number, roomId: number, content: string, type: string = 'text', imageUrl?: string, imageKey?: string) {
        const participant = await this.participantRepository.findOne({
            where: { roomId, userId },
        });

        if (!participant) {
            throw new ForbiddenException('메시지를 보낼 권한이 없습니다.');
        }

        const room = await this.roomRepository.findOne({ where: { id: roomId } });

        // 발신자가 수신자에게 차단된 경우: 저장은 하되 수신자에게 노출 안 함
        let isSilent = false;
        if (room?.instructorId && room?.centerId) {
            const recipientId = room.instructorId === userId ? room.centerId : room.instructorId;
            const block = await this.blockRepository.findOne({
                where: { blockerId: recipientId, blockedId: userId },
            });
            if (block) isSilent = true;
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

        // 차단된 발신자의 메시지는 lastMessageAt 갱신 및 알림 생략
        if (isSilent) return savedMessage;

        await this.roomRepository.update(roomId, {
            lastMessageAt: savedMessage.createdAt,
        });

        // 알림 발송: 상대방에게 CHAT_RECEIVED (PUSH)
        try {
            const room = await this.roomRepository.findOne({
                where: { id: roomId },
                relations: ['job', 'participants', 'participants.user'],
            });

            if (!room) return savedMessage;

            const otherParticipant = room.participants.find(p => p.userId !== userId);
            const sender = room.participants.find(p => p.userId === userId)?.user;

            if (otherParticipant) {
                const jobTitle = room.job?.title || '채용건';
                const senderName = sender?.nickname || '회원';
                const snippet = type === 'image' ? '이미지를 보냈습니다.' : (content.length > 20 ? content.slice(0, 20) + '...' : content);

                await this.notificationsService.createNotification({
                    receiverUserId: otherParticipant.userId,
                    type: NotificationType.CHAT_RECEIVED,
                    title: `[${jobTitle}] 새로운 메시지`,
                    body: `${senderName}: ${snippet}`,
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
