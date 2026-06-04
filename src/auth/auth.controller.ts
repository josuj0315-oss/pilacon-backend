import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
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
    async signup(@Body() body, @Req() req) {
        const user = await this.authService.signup(body);
        const tokens = await this.authService.getTokens(user);
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
        const userAgent = req.headers['user-agent'];
        await this.authService.updateRefreshToken(user.id, tokens.refreshToken, ip, userAgent);
        return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    @Post('phone/request')
    async requestPhoneVerification(@Body() body: { phone?: string }) {
        return this.authService.requestPhoneVerification(body?.phone || '');
    }

    @Post('phone/verify')
    async verifyPhoneCode(@Body() body: { phone?: string; code?: string }) {
        return this.authService.verifyPhoneCode(body?.phone || '', body?.code || '');
    }

    @Post('email/request')
    async requestEmailVerification(@Body() body: { email?: string }) {
        return this.authService.requestEmailVerification(body?.email || '');
    }

    @Post('email/verify')
    async verifyEmailCode(@Body() body: { email?: string; code?: string }) {
        return this.authService.verifyEmailCode(body?.email || '', body?.code || '');
    }

    @Post('login')
    async login(@Body() body, @Req() req) {
        const user = await this.authService.login(body);
        const tokens = await this.authService.getTokens(user);
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
        const userAgent = req.headers['user-agent'];
        await this.authService.updateRefreshToken(user.id, tokens.refreshToken, ip, userAgent);
        return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    @Post('logout')
    @UseGuards(AuthGuard('jwt'))
    async logout(@Req() req) {
        await this.authService.removeRefreshToken(req.user.id);
        return { ok: true };
    }

    @Delete('me')
    @UseGuards(AuthGuard('jwt'))
    async deleteAccount(@Req() req) {
        await this.authService.deleteAccount(req.user.id);
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
        const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '');
        try {
            const user: any = await this.authService.validateUser(req.user);
            const tokens = await this.authService.getTokens(user);
            const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
            const userAgent = req.headers['user-agent'];
            await this.authService.updateRefreshToken(user.id, tokens.refreshToken, ip, userAgent);
            res.redirect(`${frontendUrl}/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
        } catch (e: any) {
            res.redirect(`${frontendUrl}/login?authError=${encodeURIComponent(e.message || '로그인에 실패했습니다.')}`);
        }
    }

    @Get('naver')
    @UseGuards(AuthGuard('naver'))
    async naverLogin() {
        // Redirects to Naver
    }

    @Get('naver/callback')
    @UseGuards(AuthGuard('naver'))
    async naverCallback(@Req() req, @Res() res) {
        const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '');
        try {
            const user: any = await this.authService.validateUser(req.user);
            const tokens = await this.authService.getTokens(user);
            const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
            const userAgent = req.headers['user-agent'];
            await this.authService.updateRefreshToken(user.id, tokens.refreshToken, ip, userAgent);
            res.redirect(`${frontendUrl}/login?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`);
        } catch (e: any) {
            res.redirect(`${frontendUrl}/login?authError=${encodeURIComponent(e.message || '로그인에 실패했습니다.')}`);
        }
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Req() req) {
        console.log('🔥 [AuthController] getProfile - req.user:', req.user);
        return req.user;
    }

    @Post('me')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(@Req() req, @Body() body) {
        return this.authService.updateProfile(req.user.id, body);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    async patchProfile(@Req() req, @Body() body) {
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
