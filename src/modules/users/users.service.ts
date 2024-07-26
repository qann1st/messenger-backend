import { Model, RefType } from 'mongoose';

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './users.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    return this.userModel.create(createUserDto);
  }

  async searchUser(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: User[]; total: number }> {
    if (!searchTerm) throw new BadRequestException('Search term is required');

    const skip = (page - 1) * limit;
    const query = {
      username: new RegExp(searchTerm, 'i'),
      firstname: new RegExp(searchTerm, 'i'),
      lastname: new RegExp(searchTerm, 'i'),
    };

    const [data, total] = await Promise.all([
      this.userModel.find(query).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async findById(id: RefType): Promise<UserDocument> {
    return await this.userModel.findById(id);
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel
      .findOne({ email })
      .select('+approveCode')
      .select('+signInCode')
      .select('+signInCodeTimestamp');
  }

  async findByLogin(login: string): Promise<UserDocument> {
    return this.userModel.findOne({ login: login.toLowerCase() });
  }

  async update(id: RefType, update: UpdateUserDto): Promise<UserDocument> {
    return await this.userModel.findByIdAndUpdate(id, update, { new: true });
  }

  async remove(id: RefType) {
    return await this.userModel.findByIdAndDelete(id);
  }
}
