import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CentersService } from './centers.service';
import { Center } from './center.entity';

@Controller('centers')
@UseGuards(AuthGuard('jwt'))
export class CentersController {
    constructor(private readonly centersService: CentersService) { }

    @Post()
    create(@Req() req, @Body() centerData: Partial<Center>) {
        return this.centersService.create(req.user.id, centerData);
    }

    @Get()
    findAll(@Req() req) {
        return this.centersService.findAll(req.user.id);
    }

    @Get(':id')
    findOne(@Req() req, @Param('id') id: string) {
        return this.centersService.findOne(req.user.id, +id);
    }

    @Patch(':id')
    update(@Req() req, @Param('id') id: string, @Body() centerData: Partial<Center>) {
        return this.centersService.update(req.user.id, +id, centerData);
    }

    @Delete(':id')
    remove(@Req() req, @Param('id') id: string) {
        return this.centersService.remove(req.user.id, +id);
    }
}
