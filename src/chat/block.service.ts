import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBlock } from '../users/user-block.entity';
import { User } from '../users/user.entity';

@Injectable()
export class BlockService {
    constructor(
        @InjectRepository(UserBlock)
        private blockRepository: Repository<UserBlock>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async blockUser(blockerId: number, blockedId: number): Promise<void> {
        if (blockerId === blockedId) {
            throw new BadRequestException('자기 자신을 차단할 수 없습니다.');
        }
        const target = await this.userRepository.findOne({ where: { id: blockedId } });
        if (!target) throw new NotFoundException('존재하지 않는 사용자입니다.');

        const existing = await this.blockRepository.findOne({ where: { blockerId, blockedId } });
        if (existing) throw new ConflictException('이미 차단한 사용자입니다.');

        await this.blockRepository.save(this.blockRepository.create({ blockerId, blockedId }));
    }

    async unblockUser(blockerId: number, blockedId: number): Promise<void> {
        const block = await this.blockRepository.findOne({ where: { blockerId, blockedId } });
        if (!block) throw new NotFoundException('차단 내역이 없습니다.');
        await this.blockRepository.remove(block);
    }

    async getBlockedUsers(blockerId: number): Promise<any[]> {
        const blocks = await this.blockRepository.find({
            where: { blockerId },
            relations: ['blocked'],
            order: { createdAt: 'DESC' },
        });
        return blocks.map(b => ({
            userId: b.blockedId,
            nickname: b.blocked?.nickname || b.blocked?.name || '알 수 없음',
            profileImage: b.blocked?.profileImage || null,
            blockedAt: b.createdAt,
        }));
    }

    async isBlocked(blockerId: number, blockedId: number): Promise<boolean> {
        const block = await this.blockRepository.findOne({ where: { blockerId, blockedId } });
        return !!block;
    }

    async isBlockedEither(userAId: number, userBId: number): Promise<boolean> {
        const block = await this.blockRepository.findOne({
            where: [
                { blockerId: userAId, blockedId: userBId },
                { blockerId: userBId, blockedId: userAId },
            ],
        });
        return !!block;
    }
}
