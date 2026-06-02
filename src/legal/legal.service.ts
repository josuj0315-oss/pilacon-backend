import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalDocument } from './legal.entity';

const DEFAULTS: Record<string, string> = {
    terms: '이용약관 내용을 입력해주세요.',
    privacy: '개인정보처리방침 내용을 입력해주세요.',
};

@Injectable()
export class LegalService implements OnModuleInit {
    constructor(
        @InjectRepository(LegalDocument)
        private legalRepository: Repository<LegalDocument>,
    ) {}

    async onModuleInit() {
        for (const type of ['terms', 'privacy']) {
            const existing = await this.legalRepository.findOne({ where: { type } });
            if (!existing) {
                await this.legalRepository.save(this.legalRepository.create({ type, content: DEFAULTS[type] }));
            }
        }
    }

    async getByType(type: string): Promise<LegalDocument> {
        const doc = await this.legalRepository.findOne({ where: { type } });
        if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
        return doc;
    }

    async update(type: string, content: string): Promise<LegalDocument> {
        const doc = await this.legalRepository.findOne({ where: { type } });
        if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
        doc.content = content;
        return this.legalRepository.save(doc);
    }
}
