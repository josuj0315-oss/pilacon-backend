import { Controller, Get, Patch, Param, Req, UseGuards, Query, Sse, MessageEvent, Body, Header } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { Observable } from 'rxjs';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    getNotifications(@Req() req, @Query('page') page = 1) {
        return this.notificationsService.getNotifications(req.user.id, +page);
    }

    @Get('unread-count')
    getUnreadCount(@Req() req) {
        return this.notificationsService.getUnreadCount(req.user.id);
    }

    @Patch(':id/read')
    markAsRead(@Req() req, @Param('id') id: string) {
        return this.notificationsService.markAsRead(req.user.id, +id);
    }

    @Patch('read-all')
    markAllAsRead(@Req() req) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }

    @Sse('stream')
    @Header('Cache-Control', 'no-cache, no-transform')
    @Header('Connection', 'keep-alive')
    @Header('X-Accel-Buffering', 'no')
    stream(@Req() req): Observable<MessageEvent> {
        return this.notificationsService.eventStream(req.user.id);
    }

    @Get('settings')
    getSettings(@Req() req) {
        return this.notificationsService.getSettings(req.user.id);
    }

    @Patch('settings')
    updateSettings(@Req() req, @Body() body: any) {
        return this.notificationsService.updateSettings(req.user.id, body);
    }
}
