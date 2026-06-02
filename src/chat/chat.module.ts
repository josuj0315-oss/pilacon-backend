import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entities/chat-room.entity';
import { ChatParticipant } from './entities/chat-participant.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Application } from '../applications/application.entity';
import { Job } from '../jobs/job.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserBlock } from '../users/user-block.entity';
import { User } from '../users/user.entity';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ChatRoom,
            ChatParticipant,
            ChatMessage,
            Application,
            Job,
            UserBlock,
            User,
        ]),
        NotificationsModule,
    ],
    controllers: [ChatController, BlockController],
    providers: [ChatService, BlockService],
    exports: [ChatService, BlockService],
})
export class ChatModule { }
