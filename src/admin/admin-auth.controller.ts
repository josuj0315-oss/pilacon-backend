import { Controller, Post, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly adminService: AdminService) {}

    @Post('login')
    async login(@Body() body: any) {
        return this.adminService.login(body);
    }
}
