import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserAccessLog } from '../users/user-access-log.entity';
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
  private readonly emailVerificationSessions = new Map<string, PhoneVerificationSession>();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserAccessLog)
    private accessLogRepository: Repository<UserAccessLog>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async logAccess(userId: number, ip?: string, userAgent?: string) {
    try {
      await this.userRepository.update(userId, { lastLoginAt: new Date() });
      const log = this.accessLogRepository.create({ userId, ip, userAgent });
      await this.accessLogRepository.save(log);
    } catch (err) {
      console.error('Failed to log access:', err);
    }
  }

  async findUserById(id: number): Promise<User | null> {
    return await this.userRepository.findOneBy({ id });
  }

  async validateUser(details: any) {
    let user = await this.userRepository.findOneBy({
      providerId: details.providerId,
      provider: details.provider,
    });

    if (user?.status === 'DELETED') {
      const remaining = this.getRemainingCooldownDays(user.deletedAt);
      if (remaining > 0) {
        throw new UnauthorizedException(`탈퇴한 계정입니다. ${remaining}일 후 재가입 가능합니다.`);
      }
      // 30일 경과 → 식별자 익명화 후 신규 계정으로 처리
      await this.userRepository.update(user.id, { username: null, email: null, providerId: null, provider: null } as any);
      user = null;
    }

    if (user) {
      if (user.status === 'BANNED') {
        throw new UnauthorizedException('영구 정지된 계정입니다. 고객센터에 문의해 주세요.');
      }
      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException('일시 정지된 계정입니다. 고객센터에 문의해 주세요.');
      }
      user.name = details.name || user.name;
      user.email = details.email || user.email;
      return await this.userRepository.save(user);
    }

    // 같은 이메일로 탈퇴한 계정이 있는지 추가 체크
    if (details.email) {
      const deletedByEmail = await this.userRepository.findOne({
        where: { email: details.email, status: 'DELETED' },
      });
      if (deletedByEmail) {
        const remaining = this.getRemainingCooldownDays(deletedByEmail.deletedAt);
        if (remaining > 0) {
          throw new UnauthorizedException(`탈퇴한 계정입니다. ${remaining}일 후 재가입 가능합니다.`);
        }
      }
    }

    const newUser = this.userRepository.create({
      providerId: details.providerId,
      provider: details.provider,
      name: details.name,
      email: details.email,
      nickname: details.name || '사용자',
      role: 'USER',
    });

    return await this.userRepository.save(newUser);
  }

  async signup(dto: any) {
    const { username, password, nickname } = dto;

    const deletedUser = await this.userRepository.findOne({ where: { username, status: 'DELETED' } });
    if (deletedUser) {
      const remaining = this.getRemainingCooldownDays(deletedUser.deletedAt);
      if (remaining > 0) {
        throw new ConflictException(`탈퇴한 계정입니다. ${remaining}일 후 재가입 가능합니다.`);
      }
      // 30일 경과 → username 반납
      await this.userRepository.update(deletedUser.id, { username: null } as any);
    }

    const existing = await this.userRepository.findOne({ where: [{ username }, { nickname }] });
    if (existing) throw new ConflictException('이미 존재하는 아이디 또는 닉네임입니다.');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      nickname,
      provider: 'local',
    });
    return await this.userRepository.save(user);
  }

  async login(body: any) {
    const { username, password } = body;
    const user = await this.userRepository.findOne({ where: { username } });

    if (user?.status === 'DELETED') {
      const remaining = this.getRemainingCooldownDays(user.deletedAt);
      if (remaining > 0) {
        throw new UnauthorizedException(`탈퇴한 계정입니다. ${remaining}일 후 재가입 가능합니다.`);
      }
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
    if (user.status === 'BANNED') {
      throw new UnauthorizedException('영구 정지된 계정입니다. 고객센터에 문의해 주세요.');
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('일시 정지된 계정입니다. 고객센터에 문의해 주세요.');
    }
    return user;
  }

  async getTokens(user: User) {
    const payload = { sub: user.id, username: user.username, role: user.role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '1h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: number, refreshToken: string, ip?: string, userAgent?: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, { hashedRefreshToken });
    await this.logAccess(userId, ip, userAgent);
  }

  async removeRefreshToken(userId: number) {
    await this.userRepository.update(userId, { hashedRefreshToken: null } as any);
  }

  private getRemainingCooldownDays(deletedAt: Date | null): number {
    if (!deletedAt) return 0;
    const daysSince = Math.floor((Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - daysSince);
  }

  async deleteAccount(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    // 식별자(username, email, providerId, provider)는 30일간 보존 후 익명화
    await this.userRepository.update(userId, {
      status: 'DELETED',
      deletedAt: new Date(),
      password: null,
      nickname: '탈퇴회원',
      name: null,
      phone: null,
      profileImage: null,
      hashedRefreshToken: null,
    } as any);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const decoded = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.userRepository.findOneBy({ id: decoded.sub });
      if (!user || !user.hashedRefreshToken || !(await bcrypt.compare(refreshToken, user.hashedRefreshToken))) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const tokens = await this.getTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);
      return tokens;
    } catch (e) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  async updateProfile(userId: number, updateData: any) {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, updateData);
    return await this.userRepository.save(user);
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
    const code = '123456'; // MVP 수준에서는 고정값 또는 랜덤 생성
    this.phoneVerificationSessions.set(phone, { code, expiresAt: Date.now() + 300000, requestedAt: Date.now() });
    return { ok: true };
  }

  async verifyPhoneCode(phone: string, code: string) {
    const session = this.phoneVerificationSessions.get(phone);
    if (!session || session.code !== code || session.expiresAt < Date.now()) {
      throw new BadRequestException('인증번호가 일치하지 않거나 만료되었습니다.');
    }
    this.phoneVerificationSessions.delete(phone);
    return { ok: true };
  }

  async requestEmailVerification(email: string) {
    const code = '123456';
    this.emailVerificationSessions.set(email, { code, expiresAt: Date.now() + 300000, requestedAt: Date.now() });
    return { ok: true };
  }

  async verifyEmailCode(email: string, code: string) {
    const session = this.emailVerificationSessions.get(email);
    if (!session || session.code !== code || session.expiresAt < Date.now()) {
      throw new BadRequestException('인증번호가 일치하지 않거나 만료되었습니다.');
    }
    this.emailVerificationSessions.delete(email);
    await this.userRepository.update({ email }, { isEmailVerified: true, emailVerifiedAt: new Date() });
    return { ok: true };
  }
}
