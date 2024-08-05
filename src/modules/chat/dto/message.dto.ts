import { IsArray, IsHexadecimal, Length } from 'class-validator';

export class MessageDto {
  @Length(0, 1000)
  content?: string;
  @IsHexadecimal()
  replyMessage: string;
  @IsHexadecimal()
  forwardedMessage: string;
  @IsHexadecimal()
  recipient: string;
  @IsHexadecimal()
  chatId: string;
  @IsArray()
  images: string[];
}
