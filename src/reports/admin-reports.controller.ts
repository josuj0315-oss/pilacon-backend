import { Controller, Get, Patch, Param, Body, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { UpdateReportAdminDto } from './dto/update-report-admin.dto';

@Controller('admin/reports')
@UseGuards(AuthGuard('admin-jwt'))
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.reportsService.findAllAdmin(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reportsService.findOneAdmin(+id);
  }

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
