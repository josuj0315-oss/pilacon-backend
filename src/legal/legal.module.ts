import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalDocument } from './legal.entity';
import { LegalService } from './legal.service';
import { LegalController, AdminLegalController } from './legal.controller';

@Module({
    imports: [TypeOrmModule.forFeature([LegalDocument])],
    controllers: [LegalController, AdminLegalController],
    providers: [LegalService],
})
export class LegalModule {}
