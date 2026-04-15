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
            // Naver API에서 요청할 권한 범위 설정 (이 이 항목들이 Naver 개발자 센터에도 설정되어야 함)
            scope: ['email', 'name', 'gender', 'birthyear', 'mobile'], 
        });
    }

    async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
        console.log('\n========== [Naver Profile Debug] ==========');
        console.log('1. Access Token:', accessToken ? 'RECEIVED' : 'MISSING');
        console.log('2. Full Profile Structure:', JSON.stringify(profile, null, 2));
        
        // Naver API 원본 응답 구조 확인 (보통 profile._json.response 안에 실제 데이터가 위치함)
        if (profile._json) {
            console.log('3. Raw JSON Response (profile._json):', JSON.stringify(profile._json, null, 2));
        }
        console.log('===========================================\n');

        const { id, name, email, gender, birthyear, mobile } = profile;
        
        // 실제 데이터 추출 시 passport-naver-v2가 파싱한 필드 또는 _json 원본 데이터를 병행 확인
        const user = {
            providerId: id,
            provider: 'naver',
            name: name || profile._json?.response?.name,
            email: email || profile._json?.response?.email,
            gender: gender || profile._json?.response?.gender || profile._json?.response?.gender,
            birthyear: birthyear || profile._json?.response?.birthyear,
            mobile: mobile || profile._json?.response?.mobile,
        };

        console.log('4. Extracted User Object for AuthService:', user);
        done(null, user);
    }

}
