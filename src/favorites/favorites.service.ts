import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './favorite.entity';
import { Job } from '../jobs/job.entity';

@Injectable()
export class FavoritesService {
    constructor(
        @InjectRepository(Favorite)
        private favoriteRepository: Repository<Favorite>,
        @InjectRepository(Job)
        private jobRepository: Repository<Job>,
    ) { }

    async toggleFavorite(userId: number, jobId: number) {
        const job = await this.jobRepository.findOneBy({ id: jobId });
        if (!job) {
            throw new NotFoundException('Job not found');
        }

        const existing = await this.favoriteRepository.findOneBy({ userId, jobId });
        if (existing) {
            await this.favoriteRepository.remove(existing);
            return { favorited: false };
        } else {
            const favorite = this.favoriteRepository.create({ userId, jobId });
            await this.favoriteRepository.save(favorite);
            return { favorited: true };
        }
    }

    async findMyFavorites(userId: number) {
        const favorites = await this.favoriteRepository.find({
            where: { userId },
            relations: ['job'],
            order: { createdAt: 'DESC' },
        });
        return favorites.map(f => f.job);
    }
}
