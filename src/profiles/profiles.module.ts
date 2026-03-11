import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorProfile } from './instructor-profile.entity';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';

@Module({
    imports: [TypeOrmModule.forFeature([InstructorProfile])],
    providers: [ProfilesService],
    controllers: [ProfilesController],
    exports: [ProfilesService],
})
export class ProfilesModule { }
