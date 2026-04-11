import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartnershipInquiry } from './partnership.entity';
import { PartnershipService } from './partnership.service';
import { PartnershipController } from './partnership.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PartnershipInquiry])],
  providers: [PartnershipService],
  controllers: [PartnershipController],
  exports: [PartnershipService],
})
export class PartnershipModule {}
