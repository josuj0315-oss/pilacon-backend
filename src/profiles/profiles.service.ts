import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InstructorProfile } from './instructor-profile.entity';

@Injectable()
export class ProfilesService {
    constructor(
        @InjectRepository(InstructorProfile)
        private profileRepository: Repository<InstructorProfile>,
        private dataSource: DataSource,
    ) { }

    async create(userId: number, profileData: any) {
        return await this.dataSource.transaction(async (manager) => {
            if (profileData.isPrimary) {
                await manager.update(InstructorProfile,
                    { userId, type: profileData.type },
                    { isPrimary: false }
                );
            }

            const profile = manager.create(InstructorProfile, {
                ...profileData,
                userId,
                isPrimary: !!profileData.isPrimary,
            });
            return await manager.save(profile);
        });
    }

    async findAllByUserId(userId: number, type?: 'sub' | 'regular') {
        const where: any = { userId };
        if (type) {
            where.type = type;
        }
        return this.profileRepository.find({
            where,
            order: { isPrimary: 'DESC', updatedAt: 'DESC' },
        });
    }

    async findOne(id: number, userId: number) {
        const profile = await this.profileRepository.findOneBy({ id, userId });
        if (!profile) {
            throw new NotFoundException('Profile not found');
        }
        return profile;
    }

    async update(id: number, userId: number, profileData: any) {
        return await this.dataSource.transaction(async (manager) => {
            const profile = await manager.findOneBy(InstructorProfile, { id, userId });
            if (!profile) {
                throw new NotFoundException('Profile not found or not owned by user');
            }

            if (profileData.isPrimary && !profile.isPrimary) {
                await manager.update(InstructorProfile,
                    { userId, type: profile.type },
                    { isPrimary: false }
                );
            }

            Object.assign(profile, profileData);
            return await manager.save(profile);
        });
    }

    async remove(id: number, userId: number) {
        const profile = await this.profileRepository.findOneBy({ id, userId });
        if (!profile) {
            throw new NotFoundException('Profile not found or not owned by user');
        }
        return this.profileRepository.remove(profile);
    }

    async setPrimary(id: number, userId: number) {
        return await this.dataSource.transaction(async (manager) => {
            const profile = await manager.findOneBy(InstructorProfile, { id, userId });
            if (!profile) {
                throw new NotFoundException('Profile not found');
            }

            await manager.update(InstructorProfile,
                { userId, type: profile.type },
                { isPrimary: false }
            );

            profile.isPrimary = true;
            return await manager.save(profile);
        });
    }
}
