import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './center.entity';

@Injectable()
export class CentersService {
    constructor(
        @InjectRepository(Center)
        private centersRepository: Repository<Center>,
    ) { }

    async create(userId: number, centerData: Partial<Center>): Promise<Center> {
        if (centerData.isDefault) {
            await this.resetDefault(userId);
        }

        const centerCount = await this.centersRepository.count({ where: { userId, isDeleted: false } });

        // If it's the first center, make it default if not specified
        const isDefault = centerCount === 0 ? true : !!centerData.isDefault;

        if (isDefault) {
            await this.resetDefault(userId);
        }

        const newCenter = this.centersRepository.create({
            ...centerData,
            userId,
            isDefault,
        });
        return this.centersRepository.save(newCenter);
    }

    async findAll(userId: number): Promise<Center[]> {
        return this.centersRepository.find({
            where: { userId, isDeleted: false },
            order: { isDefault: 'DESC', createdAt: 'DESC' },
        });
    }

    async findOne(userId: number, id: number): Promise<Center> {
        const center = await this.centersRepository.findOne({
            where: { id, userId, isDeleted: false },
        });
        if (!center) {
            throw new NotFoundException('Center not found');
        }
        return center;
    }

    async update(userId: number, id: number, centerData: Partial<Center>): Promise<Center> {
        const center = await this.findOne(userId, id);

        if (centerData.isDefault && !center.isDefault) {
            await this.resetDefault(userId);
        }

        Object.assign(center, centerData);
        return this.centersRepository.save(center);
    }

    async remove(userId: number, id: number): Promise<void> {
        const center = await this.findOne(userId, id);
        center.isDeleted = true;
        // If the default center is deleted, we might want to assign another one as default, 
        // but the requirements don't specify this. Let's just soft delete.
        await this.centersRepository.save(center);
    }

    private async resetDefault(userId: number): Promise<void> {
        await this.centersRepository.update({ userId, isDefault: true }, { isDefault: false });
    }
}
