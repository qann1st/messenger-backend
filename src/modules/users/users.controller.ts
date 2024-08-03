import { RefType } from 'mongoose';

import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '~modules/auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '~modules/auth/guards/access-token.guard';
import MongooseClassSerializerInterceptor from '~shared/interceptors/mongo-serialize-interceptor';
import { NullInterceptor } from '~shared/interceptors/null-interceptor';

import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './users.schema';
import { UsersService } from './users.service';

class TExists {
  @ApiProperty()
  exists: boolean;
}

@UseInterceptors(
  new NullInterceptor('User'),
  MongooseClassSerializerInterceptor(User),
)
@UseGuards(AccessTokenGuard)
@Controller('users')
@ApiTags('users')
@ApiBearerAuth('Authorization')
@ApiExtraModels(User)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOkResponse({ type: [User] })
  async searchUser(
    @Query('search') searchTerm: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const { data, total } = await this.usersService.searchUser(
      searchTerm,
      page,
      limit,
    );

    return { data, total, page, limit };
  }

  @Get('/me')
  @ApiOkResponse({ type: User })
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('/me')
  @ApiOkResponse({ type: User })
  updateMe(
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
    @CurrentUser() id: RefType,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('/me')
  @ApiOkResponse({ type: User })
  remove(@CurrentUser() id: RefType) {
    return this.usersService.remove(id);
  }

  @Get('/exists/:email')
  @ApiOkResponse({ type: TExists })
  async isEmailExists(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    return {
      exists: !!user,
      isHaveApproveCode: !!user.approveCode,
    };
  }
}