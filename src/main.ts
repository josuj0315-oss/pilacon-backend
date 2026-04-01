import 'reflect-metadata';
import * as Sentry from '@sentry/nestjs';
// [유지해야 할 코드] Sentry 초기화 - 앱 시작 시 가장 먼저 실행되어야 합니다.
Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://cb6f6f207478195bf2ef19cf8e566b7d@o4511073334263808.ingest.us.sentry.io/4511073452425216',
  environment: process.env.NODE_ENV || 'production',
  tracesSampleRate: 1.0,
});

import { NestFactory, BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 400번대 에러(Client Error)는 Sentry에 보고하지 않음
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 400 && status < 500) {
        return super.catch(exception, host);
      }
    }

    Sentry.captureException(exception);
    super.catch(exception, host);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, // true allows any origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'cache-control',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    credentials: true,
  });

  // 글로벌 에러 핸들러 연결 (모든 예외를 Sentry로 강력하게 수집 보장)
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryFilter(httpAdapter));

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
