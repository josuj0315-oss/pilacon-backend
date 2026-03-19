import * as Sentry from '@sentry/nestjs';
// [유지해야 할 코드] Sentry 초기화 - 앱 시작 시 가장 먼저 실행되어야 합니다.
Sentry.init({
  dsn: 'https://cb6f6f207478195bf2ef19cf8e566b7d@o4511073334263808.ingest.us.sentry.io/4511073452425216',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
