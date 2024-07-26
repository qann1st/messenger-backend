import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';

import { TransporterService } from '~modules/transporter/transporter.service';
import { UsersService } from '~modules/users/users.service';

import { Auth, AuthDocument } from './auth.schema';
import { ApproveDto } from './dto/approve.dto';
import { SigninDto } from './dto/signin.dto';
import { SignupDto } from './dto/signup.dto';

type Payload = {
  _id: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Auth.name) private authModel: Model<AuthDocument>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private transporterService: TransporterService,
  ) {}

  async signUp(createUserDto: SignupDto) {
    const userExists = await this.usersService.findByEmail(createUserDto.email);

    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const approveCode = Math.floor(100000 + Math.random() * 900000).toString();

    this.transporterService.sendMail({
      to: createUserDto.email,
      subject: 'Подтверждение учетной записи',
      html: `<p>Ваш код подтверждения: ${approveCode}</p>`,
    });

    await this.usersService.create({
      ...createUserDto,
      approveCode,
    });

    return {
      success: true,
    };
  }

  async signIn(data: SigninDto) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new BadRequestException('User does not exist');

    const signInCode = Math.floor(100000 + Math.random() * 900000).toString();

    this.transporterService.sendMail({
      to: data.email,
      subject: 'Вход в учетную запись',
      html: `<p>Ваш код для входа: ${signInCode}</p>`,
    });

    await user.updateOne({ signInCode });

    return {
      success: true,
    };
  }

  async signInApproved({ email, approveCode: signInCode }: ApproveDto) {
    const user = await this.usersService.findByEmail(email);

    if (!user) throw new BadRequestException('User does not exist');
    if (user.signInCode == null)
      throw new BadRequestException('User have not sign in code');
    if (user.signInCode !== signInCode)
      throw new BadRequestException('Wrong code');

    const differenceInMilliseconds = Math.abs(
      Date.now() - user.signInCodeTimestamp,
    );
    const differenceInMinutes = differenceInMilliseconds / 1000 / 60;

    if (differenceInMinutes >= 15)
      throw new BadRequestException('Code expired');

    const payload: Payload = {
      _id: user._id,
      email: user.email,
    };

    await user.updateOne({ $unset: { signInCode } });

    return await this.updateRefreshToken(user._id, payload);
  }

  async approve({ approveCode, email }: ApproveDto) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    if (!user.approveCode)
      throw new BadRequestException('User already approved');
    if (user.approveCode !== approveCode)
      throw new BadRequestException('Wrong code');

    await user.updateOne({ $unset: { approveCode } });

    return { success: true };
  }

  async logout(userId: string, refreshToken: string) {
    const update = await this.authModel.findOneAndUpdate(
      { user: userId },
      { $pull: { refreshTokens: refreshToken } },
    );
    return { success: !!update };
  }

  async removeAllRefreshTokens(userId: string) {
    const update = await this.authModel.findOneAndUpdate(
      { user: userId },
      { refreshTokens: [] },
    );
    return { success: !!update };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const auth = await this.authModel
      .findOne({ user: userId })
      .populate('user');
    if (!auth.refreshTokens.includes(refreshToken))
      throw new ForbiddenException('Access Denied');
    const payload: Payload = {
      _id: auth.user._id,
      email: auth.user.email,
    };
    await this.logout(auth.user._id, refreshToken);
    return await this.updateRefreshToken(auth.user._id, payload);
  }

  async hashData(data: string) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(data, salt);
  }

  async updateRefreshToken(userId: string, payload: Payload) {
    const tokens = await this.getTokens(payload);

    await this.authModel.updateOne(
      { user: userId },
      { $addToSet: { refreshTokens: tokens.refreshToken } },
      { upsert: true },
    );

    return tokens;
  }

  private getConfProp(key: string) {
    return this.configService.get<string>(key);
  }

  async getTokens(payload: Payload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getConfProp('JWT_ACCESS_SECRET'),
        expiresIn: this.getConfProp('JWT_ACCESS_EXPIRES') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getConfProp('JWT_REFRESH_SECRET'),
        expiresIn: this.getConfProp('JWT_REFRESH_EXPIRES') || '15d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
