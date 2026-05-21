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
  private readonly emailVerificationSessions = new Map<string, PhoneVerificationSession>(); // Reuse session type

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
...
  async validateUser(details: any) {
...
  }

  async signup(dto: any) {
...
  }

  async login(body: any) {
...
  }

  async getTokens(user: User) {
...
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, { hashedRefreshToken });
    
    // 접속 정보 기록 (MVP)
    await this.logAccess(userId);
  }

  async removeRefreshToken(userId: number) {
    await this.userRepository.update(userId, { hashedRefreshToken: null } as any);
  }

  async refreshTokens(refreshToken: string) {
...
  }

  async updateProfile(userId: number, updateData: any) {
...
  }

  async checkNickname(nickname: string) {
...
  }

  async checkUsername(username: string) {
...
  }

  async requestPhoneVerification(phone: string) {
...
  }

  async verifyPhoneCode(phone: string, code: string) {
...
  }

  async requestEmailVerification(email: string) {
...
  }

  async verifyEmailCode(email: string, code: string) {
...
  }

  private normalizePhone(phone: string): string | null {
...
  }

  private generateVerificationCode(): string {
...
  }

  private getMockVerificationCode(phone: string): string {
...
  }

  private async dispatchPhoneVerificationCode(phone: string, code: string, mode: string) {
...
  }

  private getPhoneVerificationMode(): string {
...
  }
}
