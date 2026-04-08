import { Controller, Get, Param, UseGuards, Req, ForbiddenException, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InquiryService } from './inquiry.service';

@Controller('admin/inquiries')
@UseGuards(AuthGuard('jwt'))
export class AdminInquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Get()
  async findAll(@Req() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('관리 권한이 없습니다.');
    }
    return this.inquiryService.findAllAdmin();
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('관리 권한이 없습니다.');
    }
    return this.inquiryService.findOneAdmin(id);
  }
}
