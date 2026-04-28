import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminService } from './admin.service';
import { Admin } from './admin.entity';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';
import { Report } from '../reports/report.entity';
import { Center } from '../centers/center.entity';
import { Application } from '../applications/application.entity';
import { Favorite } from '../favorites/favorite.entity';
import { AdminJwtStrategy } from './guards/admin-jwt.strategy';
import { NoticeModule } from '../notice/notice.module';
import { PopupModule } from '../popup/popup.module';
import { PartnershipModule } from '../partnership/partnership.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Admin, User, Job, Report, Center, Application, Favorite]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '1d' },
            }),
        }),
        NoticeModule,
        PopupModule,
        PartnershipModule,
    ],

    controllers: [AdminAuthController, AdminController],
    providers: [AdminService, AdminJwtStrategy],
    exports: [AdminService]
})
export class AdminModule {}
