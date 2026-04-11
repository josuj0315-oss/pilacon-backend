import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartnershipInquiry } from './partnership.entity';

@Injectable()
export class PartnershipService {
  constructor(
    @InjectRepository(PartnershipInquiry)
    private readonly partnershipRepository: Repository<PartnershipInquiry>,
  ) {}

  async create(dto: any): Promise<PartnershipInquiry> {
    const inquiry = this.partnershipRepository.create(dto as Partial<PartnershipInquiry>);
    return this.partnershipRepository.save(inquiry);
  }

  async findAll(): Promise<PartnershipInquiry[]> {
    return this.partnershipRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
