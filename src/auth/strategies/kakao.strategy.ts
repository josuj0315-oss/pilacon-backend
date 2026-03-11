import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
    constructor(configService: ConfigService) {
        const clientID = configService.get<string>('KAKAO_CLIENT_ID');
        const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET');
        const callbackURL = configService.get<string>('KAKAO_CALLBACK_URL');

        console.log('--- Kakao Config Start ---');
        console.log('ClientID:', clientID);
        console.log('ClientSecret:', clientSecret);
        console.log('CallbackURL:', callbackURL);
        console.log('--- Kakao Config End ---');

        super({
            clientID: clientID!,
            clientSecret: clientSecret,
            callbackURL: callbackURL!,
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
        const { id, username, _json } = profile;
        const user = {
            socialId: String(id),
            provider: 'kakao',
            name: username || _json.kakao_account?.profile?.nickname,
            email: _json.kakao_account?.email,
        };
        done(null, user);
    }
}
