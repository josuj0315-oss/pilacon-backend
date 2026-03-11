import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('upload')
export class UploadController {
    constructor(private readonly uploadService: UploadService) { }

    @Post('profile')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file'))
    async uploadProfileImage(@UploadedFile() file: Express.Multer.File) {
        const url = await this.uploadService.uploadFile(file);
        return { url };
    }

    @Post('resume')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file'))
    async uploadResume(@UploadedFile() file: Express.Multer.File) {
        const url = await this.uploadService.uploadResume(file);
        return { url };
    }

    @Post('chat/:roomId')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file'))
    async uploadChatImage(
        @Param('roomId') roomId: string,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.uploadService.uploadChatImage(+roomId, file);
    }
}
