import { Controller, Get, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
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
        const token = this.authService.generateJwt(user);
        return { user, token };
    }

    @Post('login')
    async login(@Body() body) {
        const user = await this.authService.login(body);
        const token = this.authService.generateJwt(user);
        return { user, token };
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
        const token = this.authService.generateJwt(user);
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        res.redirect(`${frontendUrl}/login?token=${token}`);
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
        const token = this.authService.generateJwt(user);
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        res.redirect(`${frontendUrl}/login?token=${token}`);
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
