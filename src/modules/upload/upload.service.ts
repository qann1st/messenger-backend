import * as admin from 'firebase-admin';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { MFile } from './mfile.class';

@Injectable()
export class UploadService {
  private readonly bucket;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: admin.app.App,
  ) {
    this.bucket = this.firebaseAdmin.storage().bucket();
  }

  private convertToWebP(file: Buffer) {
    return sharp(file).webp().toBuffer();
  }

  async filterFiles(files: MFile[]) {
    const newFiles = await Promise.all(
      files.map(async (file) => {
        if (file.size > 10000000) {
          throw new BadRequestException('File too large');
        }

        const mimetype = file.mimetype;
        const currentFileType = mimetype.split('/')[0];
        const fileNameSplit = file.originalname.split('.');
        const type = fileNameSplit[1];
        const newName = uuidv4() + '-' + fileNameSplit[0];
        const size = file.size;

        if (mimetype.includes('image')) {
          if (currentFileType !== 'svg+xml') {
            const buffer = await this.convertToWebP(file.buffer);
            return new MFile({
              buffer,
              originalname: `${newName}.webp`,
              mimetype,
              size,
            });
          }
          return new MFile({
            buffer: file.buffer,
            originalname: `${newName}.svg`,
            mimetype,
            size,
          });
        }
        return new MFile({
          buffer: file.buffer,
          originalname: `${newName}.${type}`,
          mimetype,
          size,
        });
      }),
    );

    return newFiles;
  }

  async uploadFile(files: MFile[]) {
    return await Promise.all(
      files.map(async (file) => {
        const fileUpload = this.bucket.file(file.originalname);

        const stream = fileUpload.createWriteStream({
          metadata: {
            contentType: file.mimetype,
          },
        });

        const res = new Promise((resolve, reject) => {
          stream.on('error', (error) => {
            reject(error);
          });

          stream.on('finish', () => {
            fileUpload.makePublic().then(() => {
              const publicUrl = `https://${this.bucket.name}.storage.googleapis.com/${fileUpload.name}`;
              resolve(publicUrl);
            });
          });

          stream.end(file.buffer);
        });

        return res;
      }),
    );
  }
}
