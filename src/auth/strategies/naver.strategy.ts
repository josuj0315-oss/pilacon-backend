import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
    constructor(configService: ConfigService) {
        super({
            clientID: configService.get<string>('NAVER_CLIENT_ID'),
            clientSecret: configService.get<string>('NAVER_CLIENT_SECRET'),
            callbackURL: configService.get<string>('NAVER_CALLBACK_URL'),
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
        const { id, name, email } = profile;
        const user = {
            socialId: id,
            provider: 'naver',
            name: name,
            email: email,
        };
        done(null, user);
    }
}
