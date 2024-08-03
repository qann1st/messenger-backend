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
    userId: string,
    searchTerm: string,
    // page: number = 1,
    // limit: number = 30,
  ): Promise<{ data: User[]; total: number }> {
    if (!searchTerm) throw new BadRequestException('Search term is required');

    const query = {
      username: new RegExp(searchTerm, 'i'),
      firstname: new RegExp(searchTerm, 'i'),
      lastname: new RegExp(searchTerm, 'i'),
    };
    const usersByUsername = await this.userModel
      .find({
        username: query.username,
      })
      .lean();
    const usersByFirstname = await this.userModel
      .find({
        firstname: query.firstname,
      })
      .lean();
    const usersByLastname = await this.userModel
      .find({
        lastname: query.lastname,
      })
      .lean();

    const arr = [...usersByUsername, ...usersByFirstname, ...usersByLastname];
    const seen = new Set();
    const data = arr.filter((obj) => {
      const key = `${obj._id}-${obj.firstname}`;
      if (seen.has(key)) {
        return false;
      } else {
        seen.add(key);
        return true;
      }
    });

    return {
      data: data
        .map((user) => {
          return { ...user, id: user._id.toString() };
        })
        .filter((item) => item.id !== userId)
        .sort((a, b) => b.lastOnline - a.lastOnline),
      total: data.length,
    };
  }

  async findById(id: RefType): Promise<UserDocument> {
    const user = await this.userModel.findById(id).populate({
      path: 'dialogs',
      options: {
        sort: { createdAt: -1 },
      },
      populate: [
        {
          path: 'users',
          model: User.name,
        },
        {
          path: 'messages',
          options: {
            sort: { createdAt: -1 },
          },
        },
      ],
    });

    if (user && user.dialogs) {
      user.dialogs = user.dialogs.map((dialog: any) => {
        if (dialog.messages && dialog.messages.length > 0) {
          return {
            ...dialog.toObject(),
            id: dialog._id.toString(),
            messages: [dialog.messages[0]],
          };
        }
        return dialog;
      });
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument> {
    return this.userModel
      .findOne({ email })
      .select('+approveCode')
      .select('+signInCode')
      .select('+signInCodeTimestamp')
      .select('+email');
  }

  async update(id: RefType, update: UpdateUserDto): Promise<UserDocument> {
    return await this.userModel.findByIdAndUpdate(id, update, { new: true });
  }

  async remove(id: RefType) {
    return await this.userModel.findByIdAndDelete(id);
  }
}
