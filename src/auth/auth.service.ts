import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { MailService } from '../mail/mail.service';

type PhoneVerificationSession = {
  code: string;
  expiresAt: number;
  requestedAt: number;
};

@Injectable()
export class AuthService {
  private readonly phoneVerificationSessions = new Map<string, PhoneVerificationSession>();
  private readonly emailVerificationSessions = new Map<string, PhoneVerificationSession>(); // Reuse session type

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async validateUser(details: any) {
    console.log('\n--- [AuthService] validateUser ---');
    console.log('Details from strategy:', details);

    let user = await this.userRepository.findOneBy({
      socialId: details.socialId,
      provider: details.provider,
    });

    if (user) {
      user.name = details.name || user.name;
      user.email = details.email || user.email;

      if (details.mobile && !user.phone) {
        user.phone = details.mobile;
      }

      await this.userRepository.save(user);
      return user;
    }

    const { socialId, provider, name, email, mobile, phone } = details;

    const newUser = this.userRepository.create({
      socialId,
      provider,
      name,
      email,
      phone: mobile || phone,
      nickname: null,
    });

    console.log('🔥 newUser before save:', newUser);

    const savedUser = await this.userRepository.save(newUser);

    console.log('🔥 savedUser after save:', savedUser);

    return savedUser;
  }


  async signup(details: any) {
    const { username, password, nickname, name, email, phone, marketingAgree, phoneVerificationToken, emailVerificationToken } = details;

    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('휴대폰 번호를 입력해 주세요.');
    }

    await this.assertVerifiedPhone(normalizedPhone, phoneVerificationToken);
    await this.assertVerifiedEmail(email, emailVerificationToken);

    const existingUser = await this.userRepository.findOneBy({ username });
    if (existingUser) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    const existingPhoneUser = await this.userRepository.findOneBy({ phone: normalizedPhone });
    if (existingPhoneUser) {
      throw new ConflictException('이미 가입된 휴대폰 번호입니다.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      nickname,
      name,
      email,
      phone: normalizedPhone,
      marketingAgree: !!marketingAgree,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      provider: 'local',
    });
    console.log('🔥 newUser before save:', newUser);
    const savedUser = await this.userRepository.save(newUser);
    console.log('🔥 savedUser after save:', savedUser);
    return savedUser;
  }

  async login(details: any) {
    const { username, password } = details;
    const user = await this.userRepository.findOneBy({ username });

    if (!user || !user.password) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    return user;
  }

  async getTokens(user: User) {
    const payload = { sub: user.id, socialId: user.socialId, name: user.name, provider: user.provider };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '1h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, { hashedRefreshToken });
  }

  async removeRefreshToken(userId: number) {
    await this.userRepository.update(userId, { hashedRefreshToken: null } as any);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken);
      const userId = decoded.sub;

      const user = await this.userRepository.findOneBy({ id: userId });
      if (!user || !user.hashedRefreshToken) {
        throw new UnauthorizedException('토큰이 유효하지 않습니다.');
      }

      const rtMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
      if (!rtMatches) {
        throw new UnauthorizedException('토큰이 유효하지 않습니다.');
      }

      const tokens = await this.getTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Refresh token 만료 또는 유효하지 않음');
    }
  }

  async findUserById(id: number) {
    const user = await this.userRepository.findOneBy({ id });
    console.log(`🔥 [AuthService] findUserById(${id}):`, user);
    return user;
  }

  async updateProfile(userId: number, updateData: any) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    if (updateData.nickname !== undefined) user.nickname = updateData.nickname;
    if (updateData.email !== undefined) user.email = updateData.email;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.profileImage !== undefined) user.profileImage = updateData.profileImage;

    // 역할(role) 업데이트 처리
    if (updateData.role !== undefined) {
      if (['INSTRUCTOR', 'CENTER'].includes(updateData.role)) {
        user.role = updateData.role;
      } else {
        throw new BadRequestException('허용되지 않는 역할입니다.');
      }
    }

    return this.userRepository.save(user);
  }

  async checkNickname(nickname: string) {
    const user = await this.userRepository.findOneBy({ nickname });
    return { available: !user };
  }

  async checkUsername(username: string) {
    const user = await this.userRepository.findOneBy({ username });
    return { available: !user };
  }

  async requestPhoneVerification(phone: string) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('올바른 휴대폰 번호를 입력해 주세요.');
    }

    const existingPhoneUser = await this.userRepository.findOneBy({ phone: normalizedPhone });
    if (existingPhoneUser) {
      throw new ConflictException('이미 가입된 휴대폰 번호입니다.');
    }

    const now = Date.now();
    const existingSession = this.phoneVerificationSessions.get(normalizedPhone);
    if (existingSession && now - existingSession.requestedAt < 30_000) {
      throw new BadRequestException('인증번호는 30초 후 다시 요청할 수 있습니다.');
    }

    const mode = this.getPhoneVerificationMode();
    const code = mode === 'mock' ? this.getMockVerificationCode(normalizedPhone) : this.generateVerificationCode();
    await this.dispatchPhoneVerificationCode(normalizedPhone, code, mode);

    this.phoneVerificationSessions.set(normalizedPhone, {
      code,
      requestedAt: now,
      expiresAt: now + 5 * 60 * 1000,
    });

    return {
      ok: true,
      mode,
      message: mode === 'mock' ? '목업 인증번호를 생성했습니다.' : '인증번호를 전송했습니다.',
      ...(mode === 'mock' ? { testCode: code } : {}),
    };
  }

  async verifyPhoneCode(phone: string, code: string) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new BadRequestException('올바른 휴대폰 번호를 입력해 주세요.');
    }

    if (!/^\d{6}$/.test(String(code || ''))) {
      throw new BadRequestException('인증번호 6자리를 입력해 주세요.');
    }

    const session = this.phoneVerificationSessions.get(normalizedPhone);
    if (!session) {
      throw new BadRequestException('인증번호를 먼저 요청해 주세요.');
    }

    if (session.expiresAt < Date.now()) {
      this.phoneVerificationSessions.delete(normalizedPhone);
      throw new BadRequestException('인증 시간이 만료되었습니다. 다시 요청해 주세요.');
    }

    const mode = this.getPhoneVerificationMode();
    const isMockBypass = mode === 'mock' && code === '123456';

    if (session.code !== code && !isMockBypass) {
      throw new BadRequestException('인증번호가 올바르지 않습니다.');
    }

    this.phoneVerificationSessions.delete(normalizedPhone);
    const verificationToken = await this.jwtService.signAsync(
      {
        type: 'phone-verification',
        phone: normalizedPhone,
      },
      { expiresIn: '30m' },
    );

    return {
      verified: true,
      verificationToken,
      message: '휴대폰 인증이 완료되었습니다.',
    };
  }

  async requestEmailVerification(email: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('올바른 이메일 주소를 입력해 주세요.');
    }

    const now = Date.now();
    const existingSession = this.emailVerificationSessions.get(email);
    if (existingSession && now - existingSession.requestedAt < 30_000) {
      throw new BadRequestException('인증번호는 30초 후 다시 요청할 수 있습니다.');
    }

    const testCode = this.configService.get<string>('EMAIL_VERIFICATION_TEST_CODE');
    const code = testCode || this.generateVerificationCode();
    
    this.emailVerificationSessions.set(email, {
      code,
      requestedAt: now,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
    });

    await this.mailService.sendVerificationEmail(email, code);

    return {
      ok: true,
      message: '인증번호를 이메일로 전송했습니다.',
    };
  }

  async verifyEmailCode(email: string, code: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('올바른 이메일 주소를 입력해 주세요.');
    }

    if (!/^\d{6}$/.test(String(code || ''))) {
      throw new BadRequestException('인증번호 6자리를 입력해 주세요.');
    }

    const session = this.emailVerificationSessions.get(email);
    const testCode = this.configService.get<string>('EMAIL_VERIFICATION_TEST_CODE');
    const isTestCode = testCode && code === testCode;

    if (!isTestCode) {
      if (!session) {
        throw new BadRequestException('인증번호를 먼저 요청해 주세요.');
      }
      if (session.expiresAt < Date.now()) {
        this.emailVerificationSessions.delete(email);
        throw new BadRequestException('인증 시간이 만료되었습니다. 다시 요청해 주세요.');
      }
      if (session.code !== code) {
        throw new BadRequestException('인증번호가 올바르지 않습니다.');
      }
    }

    this.emailVerificationSessions.delete(email);
    const verificationToken = await this.jwtService.signAsync(
      {
        type: 'email-verification',
        email,
      },
      { expiresIn: '30m' },
    );

    return {
      verified: true,
      verificationToken,
      message: '이메일 인증이 완료되었습니다.',
    };
  }

  private async assertVerifiedPhone(phone: string, verificationToken?: string) {
    if (!verificationToken) {
      throw new BadRequestException('휴대폰 인증이 필요합니다.');
    }

    try {
      const decoded = await this.jwtService.verifyAsync<{ type?: string; phone?: string }>(verificationToken);
      if (decoded.type !== 'phone-verification' || decoded.phone !== phone) {
        throw new BadRequestException('휴대폰 인증 정보가 올바르지 않습니다.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('휴대폰 인증이 만료되었거나 유효하지 않습니다.');
    }
  }

  private async assertVerifiedEmail(email: string, verificationToken?: string) {
    if (!verificationToken) {
      throw new BadRequestException('이메일 인증이 필요합니다.');
    }

    try {
      const decoded = await this.jwtService.verifyAsync<{ type?: string; email?: string }>(verificationToken);
      if (decoded.type !== 'email-verification' || decoded.email !== email) {
        throw new BadRequestException('이메일 인증 정보가 올바르지 않습니다.');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('이메일 인증이 만료되었거나 유효하지 않습니다.');
    }
  }

  private normalizePhone(phone?: string) {
    const normalized = String(phone || '').replace(/\D/g, '');
    return /^01\d{8,9}$/.test(normalized) ? normalized : null;
  }

  private generateVerificationCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private getPhoneVerificationMode() {
    return this.configService.get<string>('PHONE_VERIFICATION_MODE') === 'ncloud' ? 'ncloud' : 'mock';
  }

  private getMockVerificationCode(phone: string) {
    const configuredCode = this.configService.get<string>('PHONE_VERIFICATION_TEST_CODE');
    if (/^\d{6}$/.test(String(configuredCode || ''))) {
      return configuredCode!;
    }

    return phone.slice(-6).padStart(6, '0');
  }

  private async dispatchPhoneVerificationCode(phone: string, code: string, mode: 'mock' | 'ncloud') {
    if (mode === 'mock') {
      console.log(`[Auth] Mock phone verification code for ${phone}: ${code}`);
      return;
    }

    await this.sendPhoneVerificationSms(phone, code);
  }

  private async sendPhoneVerificationSms(phone: string, code: string) {
    const accessKey = this.configService.get<string>('NCLOUD_ACCESS_KEY');
    const secretKey = this.configService.get<string>('NCLOUD_SECRET_KEY');
    const serviceId = this.configService.get<string>('NCLOUD_SMS_SERVICE_ID');
    const senderPhone = this.configService.get<string>('NCLOUD_SMS_SENDER_PHONE');

    if (!accessKey || !secretKey || !serviceId || !senderPhone) {
      throw new InternalServerErrorException('Ncloud SMS 설정이 누락되었습니다.');
    }

    const timestamp = Date.now().toString();
    const method = 'POST';
    const url = `/sms/v2/services/${serviceId}/messages`;
    const signature = this.makeNcloudSignature({
      method,
      url,
      timestamp,
      accessKey,
      secretKey,
    });

    const response = await fetch(`https://sens.apigw.ntruss.com${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
      },
      body: JSON.stringify({
        type: 'SMS',
        contentType: 'COMM',
        countryCode: '82',
        from: senderPhone,
        content: `[필라콘] 인증번호는 [${code}] 입니다.`,
        messages: [
          {
            to: phone,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new InternalServerErrorException(`Ncloud SMS 전송에 실패했습니다: ${errorText}`);
    }
  }

  private makeNcloudSignature(params: {
    method: string;
    url: string;
    timestamp: string;
    accessKey: string;
    secretKey: string;
  }) {
    const { method, url, timestamp, accessKey, secretKey } = params;
    const space = ' ';
    const newLine = '\n';
    const message = [method, space, url, newLine, timestamp, newLine, accessKey].join('');

    return createHmac('sha256', secretKey).update(message).digest('base64');
  }
}
