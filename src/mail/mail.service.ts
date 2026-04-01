import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  async sendVerificationEmail(email: string, code: string) {
    const mode = this.configService.get<string>('MAIL_MODE') || 'mock';

    if (mode === 'mock') {
      this.logger.log(`[Mock Mail] Verification code for ${email}: ${code}`);
      return;
    }

    // TODO: Implement actual email sending using nodemailer or other provider
    this.logger.warn(`Actual mail sending not implemented yet. Mode: ${mode}`);
  }
}
