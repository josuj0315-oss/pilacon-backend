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
import { Catch, ArgumentsHost } from '@nestjs/common';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    Sentry.captureException(exception);
    super.catch(exception, host);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: (origin, callback) => {
      // origin이 없는 경우(서버간 통신 등) 또는 화이트리스트 검사
      if (!origin || /localhost:(3000|5173)$/.test(origin) || /https:\/\/pilacon-frontend.*\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With,Origin,X-Requested-With,Accept-Encoding,Accept-Language,Connection,Host,Referer,User-Agent',
    credentials: true,
  });
  
  // 글로벌 에러 핸들러 연결 (모든 예외를 Sentry로 강력하게 수집 보장)
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryFilter(httpAdapter));

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
