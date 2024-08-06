import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import { TransporterService } from '~modules/transporter/transporter.service';
import { User } from '~modules/users/users.entity';

import { Auth } from './auth.entity';
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
    @InjectRepository(Auth) private authRepository: Repository<Auth>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private transporterService: TransporterService,
  ) {}

  async signUp(createUserDto: SignupDto) {
    const userExists = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const approveCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await this.transporterService.sendMail({
        to: createUserDto.email,
        subject: 'Подтверждение учетной записи',
        html: `<p>Ваш код подтверждения: ${approveCode}</p>`,
      });
    } catch (error) {
      throw new Error('Failed to send email');
    }

    const user = this.userRepository.create({
      ...createUserDto,
      approveCode,
    });
    await this.userRepository.save(user);

    return {
      success: true,
    };
  }

  async signIn(data: SigninDto) {
    const user = await this.userRepository.findOne({
      where: { email: data.email },
    });
    if (!user) throw new BadRequestException('User does not exist');

    const signInCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await this.transporterService.sendMail({
        to: data.email,
        subject: 'Вход в учетную запись',
        html: `
        <div>
          <p>Ваш код для входа: ${signInCode}</p>
          <p>Код действителен 15 минут!</p>
        </div>
        `,
      });
    } catch (error) {
      throw new Error('Failed to send email');
    }

    const date = new Date().getTime();
    await this.userRepository.update(user.id, {
      signInCode,
      signInCodeTimestamp: date,
    });

    return {
      success: true,
    };
  }

  async signInApproved({ email, approveCode: signInCode }: ApproveDto) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['signInCode', 'signInCodeTimestamp', 'id', 'email'],
    });
    if (!user) throw new BadRequestException('User does not exist');

    const differenceInMilliseconds =
      new Date().getTime() - user.signInCodeTimestamp;
    const differenceInMinutes = differenceInMilliseconds / 1000 / 60;

    if (differenceInMinutes >= 15) {
      await this.userRepository.update(user.id, {
        signInCode: null,
        signInCodeTimestamp: null,
      });

      throw new BadRequestException('Code expired');
    }

    if (!user.signInCode || user.signInCode !== signInCode)
      throw new BadRequestException('Wrong code');

    const payload: Payload = {
      _id: user.id,
      email: user.email,
    };

    await this.userRepository.update(user.id, { signInCode: null });

    return await this.updateRefreshToken(user.id, payload);
  }

  async approve({ approveCode, email }: ApproveDto) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['approveCode', 'id', 'email'],
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.approveCode)
      throw new BadRequestException('User already approved');
    if (user.approveCode !== approveCode)
      throw new BadRequestException('Wrong code');

    await this.userRepository.update(user.id, { approveCode: null });

    const payload: Payload = {
      _id: user.id,
      email: user.email,
    };

    return await this.updateRefreshToken(user.id, payload);
  }

  async logout(userId: string, refreshToken: string) {
    const auth = await this.authRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!auth) throw new BadRequestException('Auth record not found');

    const updatedTokens = auth.refreshTokens.filter(
      (token) => token !== refreshToken,
    );
    await this.authRepository.update(auth.id, { refreshTokens: updatedTokens });

    return { success: true };
  }

  async removeAllRefreshTokens(userId: string) {
    const auth = await this.authRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!auth) throw new BadRequestException('Auth record not found');

    await this.authRepository.update(auth.id, { refreshTokens: [] });
    return { success: true };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const auth = await this.authRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!auth || !auth.refreshTokens.includes(refreshToken))
      throw new ForbiddenException('Access Denied');

    const payload: Payload = {
      _id: auth.user.id,
      email: auth.user.email,
    };
    await this.logout(userId, refreshToken);
    return await this.updateRefreshToken(userId, payload);
  }

  async hashData(data: string) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(data, salt);
  }

  async updateRefreshToken(userId: string, payload: Payload) {
    const tokens = await this.getTokens(payload);

    let auth = await this.authRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!auth) {
      auth = this.authRepository.create({
        user: { id: userId },
        refreshTokens: [tokens.refreshToken],
      });
    } else {
      const updatedTokens = auth.refreshTokens.includes(tokens.refreshToken)
        ? auth.refreshTokens
        : [...auth.refreshTokens, tokens.refreshToken];
      await this.authRepository.update(auth.id, {
        refreshTokens: updatedTokens,
      });
    }

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
