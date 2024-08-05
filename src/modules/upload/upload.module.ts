import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { FirebaseAdminModule } from '~modules/firebase-admin/firebase-admin.module';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [ConfigModule, FirebaseAdminModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
