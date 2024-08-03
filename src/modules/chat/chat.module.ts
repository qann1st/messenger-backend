import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '~modules/users/users.schema';

import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { Chat, ChatSchema } from './chat.schema';
import { ChatService } from './chat.service';
import { Message, MessageSchema } from './message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Chat.name, schema: ChatSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
