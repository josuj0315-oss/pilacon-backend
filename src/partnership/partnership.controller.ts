import { Controller, Post, Body, BadRequestException, Logger } from '@nestjs/common';
import { PartnershipService } from './partnership.service';

@Controller('partnership')
export class PartnershipController {
  private readonly logger = new Logger(PartnershipController.name);

  constructor(private readonly partnershipService: PartnershipService) {}

  @Post()
  async create(@Body() body: any) {
    this.logger.log('Partnership inquiry received:', JSON.stringify(body));

    const requiredFields = [
      'name', 'phone', 'email', 'companyName', 
      'businessCategory', 'interestType', 'content'
    ];

    const missingFields = requiredFields.filter(field => !body[field] || (typeof body[field] === 'string' && !body[field].trim()));

    if (missingFields.length > 0) {
      this.logger.warn(`Missing fields: ${missingFields.join(', ')}`);
      throw new BadRequestException(`필수 항목이 누락되었습니다: ${missingFields.join(', ')}`);
    }

    const { businessCategory, businessCategoryEtc, interestType, interestTypeEtc, content } = body;

    // ETC 선택 시 추가 필드 검증
    if (businessCategory === 'ETC' && (!businessCategoryEtc || !businessCategoryEtc.trim())) {
      throw new BadRequestException('비즈니스 유형 기타 내용을 입력해주세요.');
    }

    if (interestType === 'ETC' && (!interestTypeEtc || !interestTypeEtc.trim())) {
      throw new BadRequestException('관심 영역 기타 내용을 입력해주세요.');
    }

    if (content.length < 5) {
      throw new BadRequestException('문의 내용은 최소 5자 이상 입력해주세요.');
    }

    // ETC가 아닐 경우 etc 필드 제거 (정리)
    const cleanedData = { ...body };
    if (businessCategory !== 'ETC') delete cleanedData.businessCategoryEtc;
    if (interestType !== 'ETC') delete cleanedData.interestTypeEtc;

    return this.partnershipService.create(cleanedData);
  }
}
