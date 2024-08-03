import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { UsersService } from '~modules/users/users.service';

@Injectable()
export class ApprovedGuard implements CanActivate {
  constructor(private userService: UsersService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.userService.findByEmail(
      request.body.email || request.user.email,
    );
    if (!user) throw new NotFoundException('User not found');

    if (user.approveCode) {
      throw new BadRequestException('User is not approved');
    }

    return true;
  }
}
