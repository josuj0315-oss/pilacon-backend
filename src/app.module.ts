import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/user.entity';
import { ProfilesModule } from './profiles/profiles.module';
import { ApplicationsModule } from './applications/applications.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CentersModule } from './centers/centers.module';

import { FavoritesModule } from './favorites/favorites.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('DB_HOST') || '';
        const isRds = host.includes('rds.amazonaws.com');
        return {
          type: 'mysql',
          host: host,
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true, // 주의: 프로덕션에서는 false로 설정하고 migration을 사용하는 것이 좋습니다.
          ssl: isRds ? { rejectUnauthorized: false } : false,
        };
      },
      inject: [ConfigService],
    }),
    JobsModule,
    AuthModule,
    ProfilesModule,
    ApplicationsModule,
    ChatModule,
    NotificationsModule,
    FavoritesModule,
    UploadModule,
    CentersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

