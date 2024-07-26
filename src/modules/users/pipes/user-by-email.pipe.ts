import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';

import { UsersService } from '../users.service';

@Injectable()
export class UserByEmailPipe implements PipeTransform<string> {
  constructor(private readonly usersService: UsersService) {}

  async transform(value: string) {
    const user = await this.usersService.findByEmail(value);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
