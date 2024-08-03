import { IsAlphanumeric, IsEmail } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty()
  @IsEmail()
  email: string;
  @ApiProperty()
  @IsAlphanumeric()
  firstname: string;
  @ApiProperty()
  @IsAlphanumeric()
  lastname?: string;
  @ApiProperty()
  @IsAlphanumeric()
  username?: string;
}
