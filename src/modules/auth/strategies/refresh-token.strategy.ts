import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

export type JwtRefreshPayload = {
  _id: string;
  email: string;
  refreshToken: string;
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req.cookies['rt'],
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: Omit<JwtRefreshPayload, 'refreshToken'>) {
    let refreshToken = req.get('Authorization') || req.cookies['rt'];

    refreshToken = refreshToken.replace('Bearer', '').trim();

    return { ...payload, refreshToken };
  }
}
