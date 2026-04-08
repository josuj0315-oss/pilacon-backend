import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './report.entity';
import { Job } from '../jobs/job.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Job])],
  providers: [ReportsService],
  controllers: [ReportsController, AdminReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
