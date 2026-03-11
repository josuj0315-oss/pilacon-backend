import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { InstructorProfile } from '../profiles/instructor-profile.entity';
import { Job } from '../jobs/job.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Application, InstructorProfile, Job]),
        NotificationsModule,
    ],
    providers: [ApplicationsService],
    controllers: [ApplicationsController],
    exports: [ApplicationsService],
})
export class ApplicationsModule { }
