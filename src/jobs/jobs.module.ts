import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './job.entity';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Application } from '../applications/application.entity';
import { Favorite } from '../favorites/favorite.entity';
import { NotificationSetting } from '../notifications/entities/notification-setting.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Job, Application, Favorite, NotificationSetting]),
        ApplicationsModule,
        NotificationsModule,
    ],
    providers: [JobsService, AiService],
    controllers: [JobsController, AiController],
    exports: [JobsService],
})
export class JobsModule { }
