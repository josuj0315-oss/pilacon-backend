import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inquiry } from './inquiry.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

@Injectable()
export class InquiryService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
  ) {}

  async create(userId: number, dto: CreateInquiryDto) {
    const { name, email, subject, message } = dto;

    if (!name || !email || !subject || !message) {
      throw new BadRequestException('모든 필수 항목을 입력해주세요.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('올바른 이메일 형식이 아닙니다.');
    }

    if (message.length < 5) {
      throw new BadRequestException('문의 내용은 최소 5자 이상 입력해주세요.');
    }

    const inquiry = this.inquiryRepository.create({
      userId,
      name,
      email,
      subject,
      message,
    });

    await this.inquiryRepository.save(inquiry);
    return { success: true, message: '문의가 정상적으로 접수되었습니다.' };
  }

  async findAllAdmin(): Promise<Inquiry[]> {
    return this.inquiryRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOneAdmin(id: number): Promise<Inquiry> {
    const inquiry = await this.inquiryRepository.findOne({
      where: { id },
    });

    if (!inquiry) {
      throw new NotFoundException('해당 문의 내역을 찾을 수 없습니다.');
    }

    return inquiry;
  }
}
