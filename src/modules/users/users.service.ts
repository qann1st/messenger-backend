import { Repository } from 'typeorm';

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './users.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const newUser = this.userRepository.create(createUserDto);
    return await this.userRepository.save(newUser);
  }

  async searchUser(
    userId: string,
    searchTerm: string,
  ): Promise<{ data: User[]; total: number }> {
    if (!searchTerm) throw new BadRequestException('Search term is required');

    const users = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .orWhere('user.firstname ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .orWhere('user.lastname ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`,
      })
      .getMany();

    const data = users
      .filter((user) => user.id !== userId)
      .sort((a, b) => b.lastOnline - a.lastOnline);

    return {
      data,
      total: data.length,
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['dialogs', 'dialogs.users', 'dialogs.messages'],
      order: {
        dialogs: {
          updatedAt: 'DESC',
          messages: {
            createdAt: 'DESC',
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    user.dialogs = user.dialogs.map((dialog) => {
      const lastMessage = dialog.messages.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      return {
        ...dialog,
        messages: lastMessage ? [lastMessage] : [],
      };
    });

    return user;
  }

  async findByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({
      where: { email },
      select: ['approveCode', 'signInCode', 'signInCodeTimestamp', 'email'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, updateUserDto);
    return await this.userRepository.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }
}
