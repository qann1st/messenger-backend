import { Response } from 'express';

import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Success } from '~src/shared/dto/success.dto';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ApproveDto } from './dto/approve.dto';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';
import { TokensDto } from './dto/tokens.dto';
import { ApprovedGuard } from './guards/approved.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { JwtRefreshPayload } from './strategies/refresh-token.strategy';

@Controller('/auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('Authorization')
  @ApiCreatedResponse({ type: Success })
  signUp(@Body(ValidationPipe) user: SignupDto) {
    return this.authService.signUp(user);
  }

  @UseGuards(ApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/signin')
  @ApiBearerAuth('Authorization')
  @ApiOkResponse({ type: TokensDto })
  signIn(@Body(ValidationPipe) user: SigninDto) {
    return this.authService.signIn(user);
  }

  @UseGuards(ApprovedGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/signin/approved')
  @ApiBearerAuth('Authorization')
  @ApiOkResponse({ type: TokensDto })
  async signInApproved(
    @Res() res: Response,
    @Body(ValidationPipe) user: ApproveDto,
  ) {
    const tokens = await this.authService.signInApproved(user);

    res.cookie('rt', tokens.refreshToken, {
      expires: new Date(Date.now() + 1296000000),
      httpOnly: true,
      secure: true,
    });
    res.cookie('at', tokens.accessToken, {
      expires: new Date(Date.now() + 900000),
      secure: true,
    });

    res.send(tokens);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/approve')
  @ApiBearerAuth('Authorization')
  @ApiOkResponse({ type: TokensDto })
  async approve(@Res() res: Response, @Body(ValidationPipe) data: ApproveDto) {
    const tokens = await this.authService.approve(data);

    res.cookie('rt', tokens.refreshToken, {
      expires: new Date(Date.now() + 1296000000),
      httpOnly: true,
      secure: true,
    });
    res.cookie('at', tokens.accessToken, {
      expires: new Date(Date.now() + 900000),
      secure: true,
    });

    res.send(tokens);
  }

  @UseGuards(RefreshTokenGuard)
  @Delete('/logout')
  @ApiOkResponse({
    schema: {
      properties: {
        success: {
          type: 'boolean',
        },
      },
    },
  })
  async logout(
    @Res() res: Response,
    @CurrentUser() payload: JwtRefreshPayload,
  ) {
    const result = await this.authService.logout(
      payload._id,
      payload.refreshToken,
    );

    res.clearCookie('rt');
    res.clearCookie('at');

    res.send(result);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  @ApiOkResponse({ type: TokensDto })
  async refreshTokens(
    @Res() res: Response,
    @CurrentUser() payload: JwtRefreshPayload,
  ) {
    const tokens = await this.authService.refreshTokens(
      payload._id,
      payload.refreshToken,
    );

    res.cookie('rt', tokens.refreshToken, {
      expires: new Date(Date.now() + 1296000000),
      httpOnly: true,
      secure: true,
    });
    res.cookie('at', tokens.accessToken, {
      expires: new Date(Date.now() + 900000),
      secure: true,
    });

    res.send(tokens);
  }
}
