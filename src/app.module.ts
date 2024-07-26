import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '~modules/auth/auth.module';
import { UsersModule } from '~modules/users/users.module';

import { MONGODB_URI } from './shared/utils/constants';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.dev'] }),
    MongooseModule.forRoot(MONGODB_URI),
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
