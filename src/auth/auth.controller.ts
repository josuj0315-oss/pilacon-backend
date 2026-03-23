import { Controller, Get, Post, Body, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private configService: ConfigService,
    ) { }

    @Post('signup')
    async signup(@Body() body) {
        const user = await this.authService.signup(body);
        const tokens = await this.authService.getTokens(user);
        await this.authService.updateRefreshToken(user.id, tokens.refreshToken);
        return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    @Post('login')
    async login(@Body() body) {
        const user = await this.authService.login(body);
        const tokens = await this.authService.getTokens(user);
        await this.authService.updateRefreshToken(user.id, tokens.refreshToken);
        return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    @Post('logout')
    @UseGuards(AuthGuard('jwt'))
    async logout(@Req() req) {
        await this.authService.removeRefreshToken(req.user.id);
        return { ok: true };
    }

    @Post('refresh')
    async refresh(@Body() body: { refreshToken: string }) {
        if (!body.refreshToken) {
            throw new UnauthorizedException('Refresh token is required');
        }
        return this.authService.refreshTokens(body.refreshToken);
    }

    @Get('kakao')
    @UseGuards(AuthGuard('kakao'))
    async kakaoLogin() {
        // Redirects to Kakao
    }

    @Get('kakao/callback')
    @UseGuards(AuthGuard('kakao'))
    async kakaoCallback(@Req() req, @Res() res) {
        const user: any = await this.authService.validateUser(req.user);
        const tokens = await this.authService.getTokens(user);
        await this.authService.updateRefreshToken(user.id, tokens.refreshToken);
        
        // Use FRONTEND_URL from env, fallback to production URL if missing, and remove trailing slash
        let frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://pilacon-frontend.vercel.app';
        
        // **강제 수정**: 기존 Railway 환경변수에 'pilacon.vercel.app' 등 예전 주소가 남아있을 수 있으므로 강제 덮어쓰기
        if (frontendUrl.includes('vercel.app')) {
            frontendUrl = 'https://pilacon-frontend.vercel.app';
        }
        
        frontendUrl = frontendUrl.replace(/\/$/, '');

        const finalUrl = `${frontendUrl}/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        console.log(`\n--- [Backend] Kakao Login Success ---`);
        console.log(`1. Target Frontend URL: ${frontendUrl}`);
        console.log(`2. Final Redirect URI: ${finalUrl}`);
        
        res.redirect(finalUrl);
    }

    @Get('naver')
    @UseGuards(AuthGuard('naver'))
    async naverLogin() {
        // Redirects to Naver
    }

    @Get('naver/callback')
    @UseGuards(AuthGuard('naver'))
    async naverCallback(@Req() req, @Res() res) {
        const user: any = await this.authService.validateUser(req.user);
        const tokens = await this.authService.getTokens(user);
        await this.authService.updateRefreshToken(user.id, tokens.refreshToken);
        
        // Use FRONTEND_URL from env, fallback to production URL if missing, and remove trailing slash
        let frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://pilacon-frontend.vercel.app';
        
        // **강제 수정**: 기존 Railway 환경변수에 'pilacon.vercel.app' 등 예전 주소가 남아있을 수 있으므로 강제 덮어쓰기
        if (frontendUrl.includes('vercel.app')) {
            frontendUrl = 'https://pilacon-frontend.vercel.app';
        }
        
        frontendUrl = frontendUrl.replace(/\/$/, '');

        const finalUrl = `${frontendUrl}/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        console.log(`\n--- [Backend] Naver Login Success ---`);
        console.log(`1. Target Frontend URL: ${frontendUrl}`);
        console.log(`2. Final Redirect URI: ${finalUrl}`);
        
        res.redirect(finalUrl);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req) {
        return req.user;
    }

    @Post('me')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(@Req() req, @Body() body) {
        return this.authService.updateProfile(req.user.id, body);
    }

    @Get('check-nickname')
    async checkNickname(@Req() req) {
        return this.authService.checkNickname(req.query.nickname as string);
    }

    @Get('check-username')
    async checkUsername(@Req() req) {
        return this.authService.checkUsername(req.query.username as string);
    }
}
