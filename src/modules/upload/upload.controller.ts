import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { UploadService } from './upload.service';

@ApiTags('files')
@Controller('files')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('file'))
  @ApiOkResponse({ type: [String] })
  async uploadFile(@UploadedFiles() files: Express.Multer.File[]) {
    const newFiles = await this.uploadService.filterFiles(files);

    return this.uploadService.uploadFile(newFiles);
  }
}
