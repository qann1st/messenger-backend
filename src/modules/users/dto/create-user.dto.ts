import {
  IsAlphanumeric,
  IsEmail,
  IsNumberString,
  Length,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;
  @ApiProperty()
  @IsAlphanumeric()
  username: string;
  @ApiProperty()
  @IsNumberString()
  @Length(6, 6)
  approveCode: string;
}
