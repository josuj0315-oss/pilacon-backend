import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('rooms')
    getOrCreateRoom(@Req() req, @Body('applicationId') applicationId: number) {
        return this.chatService.getOrCreateRoom(req.user.id, applicationId);
    }

    @Get('rooms')
    getMyRooms(@Req() req) {
        return this.chatService.getMyRooms(req.user.id);
    }

    @Get('rooms/:roomId/messages')
    getMessages(@Req() req, @Param('roomId') roomId: string) {
        return this.chatService.getRoomMessages(req.user.id, +roomId);
    }

    @Post('rooms/:roomId/messages')
    sendMessage(
        @Req() req,
        @Param('roomId') roomId: string,
        @Body('content') content: string,
        @Body('type') type?: string,
        @Body('imageUrl') imageUrl?: string,
        @Body('imageKey') imageKey?: string,
    ) {
        return this.chatService.sendMessage(req.user.id, +roomId, content, type, imageUrl, imageKey);
    }
}
