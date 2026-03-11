import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { Favorite } from './favorite.entity';
import { Job } from '../jobs/job.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Favorite, Job])],
    providers: [FavoritesService],
    controllers: [FavoritesController],
    exports: [FavoritesService],
})
export class FavoritesModule { }
