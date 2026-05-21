import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './report.entity';
import { Job } from '../jobs/job.entity';
import { User } from '../users/user.entity';
import { UserSanction } from '../users/user-sanction.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Job, User, UserSanction])],
  providers: [ReportsService],
  controllers: [ReportsController, AdminReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
