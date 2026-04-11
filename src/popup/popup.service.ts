import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { Popup, PopupType } from './popup.entity';

@Injectable()
export class PopupService {
  constructor(
    @InjectRepository(Popup)
    private readonly popupRepository: Repository<Popup>,
  ) {}

  // --- Admin Methods ---
  async create(dto: any): Promise<Popup> {
    const newPopup = this.popupRepository.create(dto as Partial<Popup>);
    return this.popupRepository.save(newPopup);
  }

  async findAll(): Promise<Popup[]> {
    return this.popupRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['notice'],
    });
  }

  async update(id: number, dto: any): Promise<Popup> {
    const popup = await this.popupRepository.findOne({ where: { id } });
    if (!popup) {
      throw new NotFoundException('해당 팝업을 찾을 수 없습니다.');
    }
    Object.assign(popup, dto);
    return this.popupRepository.save(popup);
  }

  async delete(id: number): Promise<void> {
    const result = await this.popupRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('삭제할 팝업을 찾을 수 없습니다.');
    }
  }

  // --- Public User Method ---
  async getActivePopups(): Promise<Popup[]> {
    const now = new Date();

    // 현재 활성화되어 있고, 기간이 유효한(startAt <= now <= endAt 또는 기간 설정 없음) 팝업 조회
    const popups = await this.popupRepository.createQueryBuilder('popup')
      .leftJoinAndSelect('popup.notice', 'notice')
      .where('popup.isActive = :isActive', { isActive: true })
      .andWhere('(popup.startAt IS NULL OR popup.startAt <= :now)', { now })
      .andWhere('(popup.endAt IS NULL OR popup.endAt >= :now)', { now })
      .orderBy('popup.createdAt', 'DESC')
      .getMany();

    // 응답 시 type에 따른 데이터 정리 (NOTICE 타입일 때 notice join 정보 포함됨)
    return popups;
  }
}
