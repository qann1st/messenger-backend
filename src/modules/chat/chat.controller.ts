import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '~modules/auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '~modules/auth/guards/access-token.guard';
import { User } from '~modules/users/users.entity';
import { NullInterceptor } from '~src/shared/interceptors/null-interceptor';

import { Chat } from './chat.entity';
import { ChatService } from './chat.service';
import { Message } from './message.entity';

class ChatWithPagination {
  @ApiProperty()
  data: Message[];
  @ApiProperty()
  users: User[];
  @ApiProperty()
  total: number;
  @ApiProperty()
  page: number;
  @ApiProperty()
  limit: number;
}

class Page {
  @ApiProperty()
  page: number;
}

@UseInterceptors(new NullInterceptor('Chat'))
@UseGuards(AccessTokenGuard)
@Controller('chat')
@ApiTags('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/createChat/:recipientId')
  @ApiBearerAuth('Authorization')
  @ApiOkResponse({ type: Chat })
  createChat(
    @Param('recipientId') recipientId: string,
    @CurrentUser() user: User,
  ) {
    return this.chatService.createChat(user.id, recipientId);
  }

  @HttpCode(HttpStatus.OK)
  @Get('/messages/:roomId')
  @ApiBearerAuth('Authorization')
  @ApiOkResponse({ type: ChatWithPagination })
  async getMessages(
    @Param('roomId') roomId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const { data, users, total } = await this.chatService.getMessages(
      roomId,
      Number(page),
      Number(limit),
    );

    return { data, users, total, page: Number(page), limit: Number(limit) };
  }

  @HttpCode(HttpStatus.OK)
  @Get('/messages/page/:messageId/:roomId/:limit')
  @ApiBearerAuth('Authorization')
  @ApiOkResponse({ type: Page })
  getMessagePageById(
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Param('limit') limit: number = 10,
  ) {
    return this.chatService.getPageMessageById(
      messageId,
      roomId,
      Number(limit),
    );
  }
}
