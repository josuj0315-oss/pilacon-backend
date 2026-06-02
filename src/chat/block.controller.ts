import { Controller, Post, Delete, Get, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BlockService } from './block.service';

@Controller('users/block')
@UseGuards(AuthGuard('jwt'))
export class BlockController {
    constructor(private readonly blockService: BlockService) {}

    @Post(':targetId')
    async block(@Req() req, @Param('targetId', ParseIntPipe) targetId: number) {
        await this.blockService.blockUser(req.user.id, targetId);
        return { ok: true };
    }

    @Delete(':targetId')
    async unblock(@Req() req, @Param('targetId', ParseIntPipe) targetId: number) {
        await this.blockService.unblockUser(req.user.id, targetId);
        return { ok: true };
    }

    @Get()
    async getBlockedUsers(@Req() req) {
        return this.blockService.getBlockedUsers(req.user.id);
    }
}
