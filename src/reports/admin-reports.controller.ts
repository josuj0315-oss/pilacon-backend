import { Controller, Get, Patch, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { UpdateReportAdminDto } from './dto/update-report-admin.dto';

@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}
  
  // @UseGuards(AuthGuard('jwt')) // TODO: 임시로 JWT 가드 적용. 실제 운영 시 어드민 전용 가드 필요
  @Get()
  async findAll(@Query() query: any) {
    return this.reportsService.findAllAdmin(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reportsService.findOneAdmin(+id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateReportAdminDto,
  ) {
    const adminId = req.user.id;
    return this.reportsService.updateStatus(adminId, +id, dto);
  }
}
