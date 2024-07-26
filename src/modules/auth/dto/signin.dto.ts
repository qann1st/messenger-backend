import { IsEmail } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class SigninDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
