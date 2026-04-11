import { Controller, Get, Post, Body, Query, UseGuards, Param, Put, Delete, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '@nestjs/passport';
import { NoticeService } from '../notice/notice.service';
import { CreateNoticeDto } from '../notice/dto/create-notice.dto';
import { PopupService } from '../popup/popup.service';
import { PartnershipService } from '../partnership/partnership.service';

@Controller('admin')
@UseGuards(AuthGuard('admin-jwt'))
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly noticeService: NoticeService,
        private readonly popupService: PopupService,
        private readonly partnershipService: PartnershipService,
    ) {}

    // --- 공지사항 관리 (우선순위를 위해 상단 배치) ---
    @Get('notices')
    async findAllNotices() {
        return this.noticeService.findAllForAdmin();
    }

    @Get('notices/:id')
    async findOneNotice(@Param('id', ParseIntPipe) id: number) {
        return this.noticeService.findOne(id, true);
    }

    @Post('notices')
    async createNotice(@Body() dto: CreateNoticeDto) {
        return this.noticeService.create(dto);
    }

    @Put('notices/:id')
    async updateNotice(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
        return this.noticeService.update(id, dto);
    }

    @Delete('notices/:id')
    async deleteNotice(@Param('id', ParseIntPipe) id: number) {
        return this.noticeService.delete(id);
    }

    // --- 팝업 관리 ---
    @Get('popups')
    async findAllPopups() {
        return this.popupService.findAll();
    }

    @Post('popups')
    async createPopup(@Body() dto: any) {
        return this.popupService.create(dto as any);
    }

    @Put('popups/:id')
    async updatePopup(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
        return this.popupService.update(id, dto);
    }

    @Delete('popups/:id')
    async deletePopup(@Param('id', ParseIntPipe) id: number) {
        return this.popupService.delete(id);
    }

    // --- 제휴 문의 관리 ---
    @Get('partnership')
    async findAllPartnerships() {
        return this.partnershipService.findAll();
    }

    // --- 기타 관리 기능 ---
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
