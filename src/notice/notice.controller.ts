import { Controller, Get, Post, Param, Body, UseGuards, Req, ForbiddenException, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NoticeService } from './notice.service';
import { Notice } from './notice.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';

@Controller('notices')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @Get()
  async findAll(): Promise<Notice[]> {
    return this.noticeService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Notice> {
    return this.noticeService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Req() req: any, @Body() dto: CreateNoticeDto): Promise<Notice> {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('관리 권한이 없습니다.');
    }
    return this.noticeService.create(dto);
  }
}
