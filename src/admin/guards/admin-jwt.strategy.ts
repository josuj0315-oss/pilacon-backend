import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../admin.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
    constructor(
        configService: ConfigService,
        @InjectRepository(Admin) private adminRepository: Repository<Admin>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
        });
    }

    async validate(payload: any) {
        if (!payload.isAdmin) {
            throw new UnauthorizedException('관리자 토큰이 아닙니다.');
        }
        const admin = await this.adminRepository.findOne({ where: { id: payload.sub } });
        if (!admin) {
            throw new UnauthorizedException('유효하지 않은 관리자 토큰입니다.');
        }
        return admin;
    }
}
