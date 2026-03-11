import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Center } from './center.entity';
import { CentersService } from './centers.service';
import { CentersController } from './centers.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Center])],
    providers: [CentersService],
    controllers: [CentersController],
    exports: [CentersService],
})
export class CentersModule { }
