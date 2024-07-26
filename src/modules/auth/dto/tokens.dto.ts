import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class TokensDto {
  @ApiProperty()
  @IsString()
  accessToken: string;
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
