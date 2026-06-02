import { Controller, Post, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly adminService: AdminService) {}

    @Post('login')
    async login(@Body() body: any) {
        return this.adminService.login(body);
    }

    @Patch('password')
    @UseGuards(AuthGuard('admin-jwt'))
    async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
        return this.adminService.changePassword(req.user.id, body.currentPassword, body.newPassword);
    }
}
