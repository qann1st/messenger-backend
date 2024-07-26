import { IsEmail, IsNumberString, Length } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class ApproveDto {
  @ApiProperty()
  @IsNumberString()
  @Length(6, 6)
  approveCode: string;
  @ApiProperty()
  @IsEmail()
  email: string;
}
