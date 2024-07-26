import { isHexadecimal } from 'class-validator';

import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform {
  static validate(value: string) {
    if (!isHexadecimal(value) || value.toString().length !== 24)
      throw new BadRequestException('Not valid ObjectID');
  }

  transform(value: string) {
    ParseObjectIdPipe.validate(value);
    return value;
  }
}
