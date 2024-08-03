import { IsHexadecimal, IsString, Length } from 'class-validator';

export class MessageDto {
  @IsString()
  @Length(1, 1000)
  content: string;
  @IsHexadecimal()
  replyMessage: string;
  @IsHexadecimal()
  forwardedMessage: string;
  @IsHexadecimal()
  recipient: string;
  @IsHexadecimal()
  chatId: string;
}
