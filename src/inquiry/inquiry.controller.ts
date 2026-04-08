import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InquiryService } from './inquiry.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Controller('inquiries')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Req() req, @Body() dto: CreateInquiryDto) {
    return this.inquiryService.create(req.user.id, dto);
  }
}
