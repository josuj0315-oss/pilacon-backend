import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProfilesService } from './profiles.service';

@Controller('instructor-profiles')
@UseGuards(AuthGuard('jwt'))
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) { }

    @Post()
    create(@Req() req, @Body() profileData: any) {
        return this.profilesService.create(req.user.id, profileData);
    }

    @Get()
    findAll(@Req() req, @Query('type') type?: 'sub' | 'regular') {
        return this.profilesService.findAllByUserId(req.user.id, type);
    }

    @Get(':id')
    findOne(@Req() req, @Param('id') id: string) {
        return this.profilesService.findOne(+id, req.user.id);
    }

    @Patch(':id')
    update(@Req() req, @Param('id') id: string, @Body() profileData: any) {
        return this.profilesService.update(+id, req.user.id, profileData);
    }

    @Delete(':id')
    remove(@Req() req, @Param('id') id: string) {
        return this.profilesService.remove(+id, req.user.id);
    }

    @Post(':id/set-primary')
    setPrimary(@Req() req, @Param('id') id: string) {
        return this.profilesService.setPrimary(+id, req.user.id);
    }
}
