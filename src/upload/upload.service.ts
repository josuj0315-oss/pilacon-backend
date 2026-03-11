import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class UploadService {
    private s3Client: S3Client;

    constructor(private configService: ConfigService) {
        const region = this.configService.get<string>('AWS_REGION');
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

        console.log(`[UploadService] Initializing S3 Client with region: ${region}`);
        if (!accessKeyId || !secretAccessKey) {
            console.error('[UploadService] AWS Credentials are missing!');
        } else {
            console.log(`[UploadService] AccessKeyID length: ${accessKeyId.length}, SecretAccessKey length: ${secretAccessKey.length}`);
        }

        this.s3Client = new S3Client({
            region: region,
            credentials: {
                accessKeyId: accessKeyId!,
                secretAccessKey: secretAccessKey!,
            },
        });
    }

    async uploadFile(file: Express.Multer.File): Promise<string> {
        console.log(`[UploadService] Starting uploadFile for: ${file.originalname}, mimetype: ${file.mimetype}`);
        // 1. 체크: 파일 크기 (5MB 이하)
        if (file.size > 5 * 1024 * 1024) {
            throw new BadRequestException('Image size must be less than 5MB');
        }

        // 2. 체크: 이미지 타입 검증
        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Only image files are allowed');
        }

        const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
        const region = this.configService.get<string>('AWS_REGION');
        const key = `profiles/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, "")}.webp`; // 확장자를 .webp로 통일 제안 (선택사항, 원본 확장자 유지 가능)

        // 3. 리사이징 및 1:1 비율 크롭 (Sharp 사용)
        // 500x500 으로 권장 규격 저장 (1080 이하)
        const processedImageBuffer = await sharp(file.buffer)
            .resize(500, 500, {
                fit: 'cover', // 1:1 로 채우면서 튀어나오는 부분은 잘라냄
                position: 'center'
            })
            .webp({ quality: 80 }) // 파일 크기 최적화를 위해 webp 변환 (선택사항)
            .toBuffer();

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: processedImageBuffer,
                    ContentType: 'image/webp',
                }),
            );

            return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
        } catch (error) {
            console.error('[UploadService] Error uploading file to S3:', error);
            throw new BadRequestException(`Failed to upload to S3: ${error.name || error.message}`);
        }
    }

    async uploadResume(file: Express.Multer.File): Promise<string> {
        console.log(`[UploadService] Starting uploadResume for: ${file.originalname}, mimetype: ${file.mimetype}`);
        // 1. 체크: 파일 크기 (10MB 이하)
        if (file.size > 10 * 1024 * 1024) {
            throw new BadRequestException('File size must be less than 10MB');
        }

        // 2. 체크: 타입 검증
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Only jpeg, png, and pdf files are allowed');
        }

        const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
        const region = this.configService.get<string>('AWS_REGION');
        const extension = file.originalname.split('.').pop();
        const key = `dev/resumes/${uuidv4()}-${file.originalname.replace(/\.[^/.]+$/, "")}.${extension}`;

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }),
            );

            return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
        } catch (error) {
            console.error('[UploadService] Error uploading resume to S3:', error);
            throw new BadRequestException(`Failed to upload to S3: ${error.name || error.message}`);
        }
    }

    async uploadChatImage(roomId: number, file: Express.Multer.File): Promise<{ url: string, key: string }> {
        console.log(`[UploadService] Starting uploadChatImage for room ${roomId}: ${file.originalname}`);

        if (file.size > 10 * 1024 * 1024) {
            throw new BadRequestException('Image size must be less than 10MB');
        }

        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException('Only image files are allowed');
        }

        const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
        const region = this.configService.get<string>('AWS_REGION');
        const timestamp = Date.now();
        const filename = file.originalname.replace(/\s/g, '_');
        const key = `chat/${roomId}/${timestamp}_${filename}`;

        // 채팅 이미지는 원본 비율을 가급적 유지하면서 압축/리사이징 (최대 너비 1200)
        const processedImageBuffer = await sharp(file.buffer)
            .resize(1200, null, {
                withoutEnlargement: true,
                fit: 'inside'
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: processedImageBuffer,
                    ContentType: 'image/jpeg',
                }),
            );

            return {
                url: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`,
                key: key
            };
        } catch (error) {
            console.error('[UploadService] Error uploading chat image to S3:', error);
            throw new BadRequestException(`Failed to upload chat image to S3: ${error.name || error.message}`);
        }
    }
}
