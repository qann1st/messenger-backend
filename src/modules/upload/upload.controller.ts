import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AccessTokenGuard } from '~modules/auth/guards/access-token.guard';

import { UploadService } from './upload.service';

@UseGuards(AccessTokenGuard)
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
