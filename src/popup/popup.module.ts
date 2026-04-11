import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Popup } from './popup.entity';
import { PopupService } from './popup.service';
import { PopupController } from './popup.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Popup])],
  providers: [PopupService],
  controllers: [PopupController],
  exports: [PopupService],
})
export class PopupModule {}
