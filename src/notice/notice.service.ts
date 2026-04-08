import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from './notice.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';

@Injectable()
export class NoticeService implements OnModuleInit {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
  ) {}

  async onModuleInit() {
    // [개발용 임시 로직] 테이블이 비어 있을 때만 샘플 데이터 삽입
    const count = await this.noticeRepository.count();
    if (count === 0) {
      console.log('[NoticeService] Seeding initial notices...');
      await this.noticeRepository.save([
        {
          title: '필라콘 서비스 정식 런칭 안내',
          content: '안녕하세요, 필라콘입니다.\n\n필라테스와 요가 강사님들을 위한 전문 채용 플랫폼 필라콘이 정식으로 서비스를 시작했습니다.\n\n쉽고 빠른 공고 확인과 지원이 가능하도록 지속적으로 업데이트하겠습니다.\n\n감사합니다.',
          isPublished: true,
        },
        {
          title: '개인정보처리방침 개정 공지',
          content: '회원님들의 소중한 개인정보를 더욱 안전하게 관리하기 위해 개인정보처리방침이 개정되었습니다.\n\n상세 내용은 하단 개인정보처리방침 페이지에서 확인 가능합니다.\n\n- 개정 일자: 2026년 4월 8일',
          isPublished: true,
        },
      ]);
    }
  }

  async findAll(): Promise<Notice[]> {
    return this.noticeRepository.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Notice> {
    const notice = await this.noticeRepository.findOne({
      where: { id, isPublished: true },
    });

    if (!notice) {
      throw new NotFoundException('해당 공지사항을 찾을 수 없거나 비공개 상태입니다.');
    }

    return notice;
  }

  async create(dto: CreateNoticeDto): Promise<Notice> {
    const { title, content } = dto;

    if (!title || !title.trim()) {
      throw new BadRequestException('제목을 입력해주세요.');
    }

    if (!content || !content.trim()) {
      throw new BadRequestException('내용을 입력해주세요.');
    }

    if (content.length < 5) {
      throw new BadRequestException('공지 내용은 최소 5자 이상 입력해주세요.');
    }

    const notice = this.noticeRepository.create(dto);
    return this.noticeRepository.save(notice);
  }
}
