import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('admin')
@UseGuards(AuthGuard('admin-jwt'))
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Post('users/admin')
    async createAdmin(@Body() body: any) {
        return this.adminService.createAdmin(body);
    }

    @Get('stats')
    async getStats() {
        return this.adminService.getStats();
    }

    @Get('dashboard/recent')
    async getRecentDashboard() {
        return this.adminService.getRecentDashboard();
    }

    @Get('reports')
    async getReports(@Query('status') status?: string) {
        return this.adminService.getReports(status);
    }

    @Get('users')
    async getUsers(@Query('search') search?: string) {
        return this.adminService.getUsers(search);
    }

    @Get('jobs')
    async getJobs() {
        return this.adminService.getJobs();
    }
}
