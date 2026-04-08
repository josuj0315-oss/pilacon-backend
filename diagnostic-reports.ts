import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ReportsService } from './src/reports/reports.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const reportsService = app.get(ReportsService);

  console.log('--- ALL REPORTS ---');
  const allReports = await reportsService.findAllAdmin({});
  console.log(JSON.stringify(allReports, null, 2));

  console.log('--- PENDING REPORTS ---');
  const pendingReports = await reportsService.findAllAdmin({ status: 'PENDING' });
  console.log(JSON.stringify(pendingReports, null, 2));

  await app.close();
}
bootstrap();
