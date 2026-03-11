import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
export class FavoritesController {
    constructor(private readonly favoritesService: FavoritesService) { }

    @Post(':jobId')
    toggleFavorite(@Request() req, @Param('jobId') jobId: number) {
        return this.favoritesService.toggleFavorite(req.user.id, +jobId);
    }

    @Get('me')
    findMyFavorites(@Request() req) {
        return this.favoritesService.findMyFavorites(req.user.id);
    }
}
