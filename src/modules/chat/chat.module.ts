import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FirebaseAdminModule } from '~modules/firebase-admin/firebase-admin.module';
import { UploadService } from '~modules/upload/upload.service';
import { User } from '~modules/users/users.entity';

import { ChatController } from './chat.controller';
import { Chat } from './chat.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Message } from './message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Chat, User]),
    JwtModule.register({}),
    FirebaseAdminModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, UploadService],
})
export class ChatModule {}
