import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '~modules/auth/auth.module';
import { ChatModule } from '~modules/chat/chat.module';
import { UploadModule } from '~modules/upload/upload.module';
import { UsersModule } from '~modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.dev'] }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/messenger',
    ),
    AuthModule,
    UsersModule,
    UploadModule,
    ChatModule,
  ],
})
export class AppModule {}
