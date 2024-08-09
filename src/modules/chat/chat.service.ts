import { Repository } from 'typeorm';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from '~modules/users/users.entity';

import { Chat } from './chat.entity';
import { Message } from './message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
  ) {}

  async createChat(userId: string, recipientId: string) {
    if (!recipientId) throw new BadRequestException('Recipient id is required');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dialogs'],
    });
    const recipient = await this.userRepository.findOne({
      where: { id: recipientId },
      relations: ['dialogs'],
    });

    if (!user || !recipient) {
      throw new NotFoundException('User or recipient not found');
    }

    const chat = this.chatRepository.create({
      users: [user, recipient],
    });

    await this.chatRepository.save(chat);

    if (!user.dialogs) user.dialogs = [];
    if (!recipient.dialogs) recipient.dialogs = [];

    user.dialogs.unshift(chat);
    recipient.dialogs.unshift(chat);

    await this.userRepository.save(user);
    await this.userRepository.save(recipient);

    return this.chatRepository.findOne({
      where: { id: chat.id },
      relations: ['users'],
    });
  }

  async deleteChat(chatId: string, userId: string, recipientId: string) {
    if (!chatId) throw new BadRequestException('Chat id is required');
    if (!recipientId) throw new BadRequestException('Recipient id is required');

    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['users', 'messages'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    await this.messageRepository.delete({ chatId });
    await this.chatRepository.remove(chat);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['dialogs'],
    });
    const recipient = await this.userRepository.findOne({
      where: { id: recipientId },
      relations: ['dialogs'],
    });

    if (user && recipient) {
      user.dialogs = user.dialogs.filter((dialog) => dialog.id !== chatId);
      recipient.dialogs = recipient.dialogs.filter(
        (dialog) => dialog.id !== chatId,
      );

      await this.userRepository.save(user);
      await this.userRepository.save(recipient);
    }

    return chat;
  }

  async addMessage(chatId: string, message: Message) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['messages'],
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    chat.messages.push(message);
    await this.chatRepository.save(chat);

    return chat;
  }

  async getMessages(chatId: string, page: number = 1, limit: number = 30) {
    const skip = (page - 1) * limit;

    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['users', 'messages', 'messages.replyMessage'],
        order: { messages: { createdAt: 'DESC' } },
      });

      if (!chat.messages) chat.messages = [];

      if (!chat) {
        throw new NotFoundException('Chat not found');
      }

      const messages = chat.messages.slice(skip, skip + limit);

      return {
        data: messages,
        users: chat.users,
        total: chat.messages.length,
      };
    } catch (err) {
      throw new BadRequestException('Invalid chat id or chat not found');
    }
  }

  async getPageMessageById(messageId: string, chatId: string, limit: number) {
    try {
      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['messages'],
        order: { messages: { createdAt: 'DESC' } },
      });

      if (!chat) {
        throw new NotFoundException('Chat not found');
      }

      if (!chat.messages) chat.messages = [];

      const messageIndex = chat.messages.findIndex(
        (msg) => msg.id === messageId,
      );

      if (messageIndex === -1) {
        throw new NotFoundException('Message not found');
      }

      const page = Math.floor(messageIndex / limit) + 1;

      return { page };
    } catch (err) {
      throw new BadRequestException('Invalid chat id or chat not found');
    }
  }
}
