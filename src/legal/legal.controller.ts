import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LegalService } from './legal.service';

// 공개 엔드포인트
@Controller('legal')
export class LegalController {
    constructor(private readonly legalService: LegalService) {}

    @Get(':type')
    getByType(@Param('type') type: string) {
        return this.legalService.getByType(type);
    }
}

// 어드민 전용 엔드포인트
@Controller('admin/legal')
@UseGuards(AuthGuard('admin-jwt'))
export class AdminLegalController {
    constructor(private readonly legalService: LegalService) {}

    @Get(':type')
    getByType(@Param('type') type: string) {
        return this.legalService.getByType(type);
    }

    @Put(':type')
    update(@Param('type') type: string, @Body('content') content: string) {
        return this.legalService.update(type, content);
    }
}
