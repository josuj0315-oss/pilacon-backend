import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './inquiry.entity';
import { InquiryService } from './inquiry.service';
import { InquiryController } from './inquiry.controller';
import { AdminInquiryController } from './admin-inquiry.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry])],
  controllers: [InquiryController, AdminInquiryController],
  providers: [InquiryService],
  exports: [InquiryService],
})
export class InquiryModule {}
