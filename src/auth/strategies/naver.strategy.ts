import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-naver-v2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NaverStrategy extends PassportStrategy(Strategy, 'naver') {
    constructor(configService: ConfigService) {
        const clientID = configService.get<string>('NAVER_CLIENT_ID') || 'MISSING_CLIENT_ID';
        const clientSecret = configService.get<string>('NAVER_CLIENT_SECRET') || 'MISSING_CLIENT_SECRET';
        const callbackURL = configService.get<string>('NAVER_CALLBACK_URL') || 'http://localhost:3000/auth/naver/callback';

        super({
            clientID,
            clientSecret,
            callbackURL,
        });
    }

    authenticate(req: any, options: any) {
        try {
            const clientID = (this as any)._oauth2?._clientId || (this as any)._clientId;
            if (clientID === 'MISSING_CLIENT_ID') {
                return this.error(new Error('NAVER_CLIENT_ID is not configured in environment variables.'));
            }
            super.authenticate(req, options);
        } catch (err) {
            console.error('Exception in NaverStrategy.authenticate:', err);
            this.error(err);
        }
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
