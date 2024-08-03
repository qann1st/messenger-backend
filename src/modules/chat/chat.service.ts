import { Model } from 'mongoose';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { User, UserDocument } from '~modules/users/users.schema';

import { Chat, ChatDocument } from './chat.schema';
import { Message, MessageDocument } from './message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messagesModel: Model<MessageDocument>,
  ) {}

  async createChat(userId: string, recipientId: string) {
    if (!recipientId) throw new BadRequestException('Recipient id is required');
    const chat = await this.chatModel.create({
      users: [userId, recipientId],
    });

    await this.userModel.findByIdAndUpdate(userId, {
      $push: { dialogs: chat.id },
    });
    await this.userModel.findByIdAndUpdate(recipientId, {
      $push: { dialogs: chat.id },
    });

    return await this.chatModel.findById(chat.id).populate('users');
  }

  async deleteChat(chatId: string, userId: string, recipientId: string) {
    if (!chatId) throw new BadRequestException('Chat id is required');
    if (!recipientId) throw new BadRequestException('Recipient id is required');
    const chat = await this.chatModel.findByIdAndDelete(chatId);
    await this.messagesModel.deleteMany({ chatId });

    await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { dialogs: chatId } },
      { new: true },
    );
    await this.userModel.findByIdAndUpdate(
      recipientId,
      { $pull: { dialogs: chatId } },
      { new: true },
    );

    return chat;
  }

  async addMessage(chatId: string, message: Message) {
    return this.chatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: message.id } },
      { new: true },
    );
  }

  async getMessages(chatId: string, page: number = 1, limit: number = 30) {
    const skip = (page - 1) * limit;

    const chat = await this.chatModel
      .findById(chatId)
      .populate({
        path: 'messages',
        populate: [{ path: 'sender' }],
        options: {
          sort: { createdAt: -1 },
        },
      })
      .populate('users')
      .exec();

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return {
      data: chat.messages.slice(skip, skip + limit),
      users: chat.users,
      total: chat.messages.length,
    };
  }
}
