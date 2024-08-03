import { IsAlphanumeric, IsEmail, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty()
  @IsEmail()
  email?: string;
  @ApiProperty()
  @IsAlphanumeric()
  username?: string;
  @ApiProperty()
  @IsString()
  firstname?: string;
  @ApiProperty()
  @IsString()
  lastname?: string;
}
