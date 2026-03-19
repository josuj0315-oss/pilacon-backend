import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // 배포 Sentry 연동 확인용 임시 라우트 (운영 확인 후 즉시 본 메서드 제거 요망)
  @Get('sentry-test')
  testSentry(): never {
    throw new Error('Production backend test');
  }
}
