import { Redis } from 'ioredis';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { MFile } from '~modules/upload/mfile.class';
import { UploadService } from '~modules/upload/upload.service';
import { User } from '~modules/users/users.entity';

import { Chat } from './chat.entity';
import { ChatService } from './chat.service';
import { MessageDto } from './dto/message.dto';
import { Message } from './message.entity';

@WebSocketGateway(8000, {
  namespace: 'chat',
  cors: true,
  transports: ['websocket', 'polling'],
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private redisClient: Redis;

  constructor(
    @InjectRepository(Chat) private chatRepository: Repository<Chat>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private uploadService: UploadService,
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT) ?? 32768;

    this.redisClient = new Redis({
      host,
      port,
      connectionName: 'chat',
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth['token'];
      if (!token) return client.disconnect();

      const jwtUser = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      if (!jwtUser._id) return;

      await this.redisClient.set(jwtUser._id, client.id);
      await this.redisClient.set(client.id, jwtUser._id);

      const user = await this.userRepository.findOne({
        where: { id: jwtUser._id },
        relations: ['dialogs', 'dialogs.users'],
      });

      if (!user) return;

      await this.userRepository.update(jwtUser._id, { isOnline: true });

      user.dialogs.forEach(async (el: Chat) => {
        const recipient = el.users.find((id) => id.id !== user.id);
        const userId = await this.redisClient.get(String(recipient.id));
        if (userId) {
          client.to(userId).emit('online', el.id);
        }
      });
    } catch {}
  }

  async handleDisconnect(client: Socket) {
    try {
      const token = client.handshake.auth['token'];
      if (!token) return client.disconnect();

      const jwtUser = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      if (!jwtUser._id) return;

      await this.redisClient.del(jwtUser._id);
      await this.redisClient.del(client.id);

      const user = await this.userRepository.findOne({
        where: { id: jwtUser._id },
        relations: ['dialogs', 'dialogs.users'],
      });

      if (!user) return;

      await this.userRepository.update(jwtUser._id, {
        isOnline: false,
        lastOnline: new Date().getTime(),
      });

      user.dialogs.forEach(async (el: Chat) => {
        const recipient = el.users.find((id) => id.id !== user.id);
        const userId = await this.redisClient.get(String(recipient.id));
        if (userId) {
          client.to(userId).emit('offline', el.id, user.lastOnline);
        }
      });
    } catch {}
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket,
    {
      content,
      forwardedMessage,
      recipient,
      replyMessage,
      chatId,
      images,
      voiceMessage,
      size,
    }: MessageDto,
  ) {
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) return;
    const senderUser = await this.userRepository.findOne({
      where: { id: sender },
    });

    if (!content && !images && !voiceMessage) return;
    if (!recipient || !sender) return;

    const recipientUser = await this.userRepository.findOne({
      where: { id: recipient },
      relations: ['dialogs'],
    });
    if (recipientUser && !recipientUser.dialogs.includes(chat)) {
      recipientUser.dialogs.push(chat);
      await this.userRepository.save(recipientUser);
    }

    let fileUrl = '';
    if (voiceMessage) {
      const file = new MFile({
        buffer: voiceMessage,
        mimetype: 'audio/ogg; codecs=opus',
        originalname: 'voice.ogg',
        size,
      } as MFile);

      const newFiles = await this.uploadService.filterFiles([file]);
      const uploadedFiles = await this.uploadService.uploadFile(newFiles);
      fileUrl = uploadedFiles[0] as string;
    }

    const message = this.messageRepository.create({
      forwardedMessage,
      voiceMessage: fileUrl,
      replyMessage,
      content,
      sender: senderUser,
      chatId,
      images: images,
    });

    const savedMessage = await this.messageRepository.save(message);

    const msg = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['replyMessage'],
    });

    client.emit('message', msg);
    client.to(recipientSocket).emit('message', msg);
  }

  @SubscribeMessage('read-messages')
  async readMessages(
    client: Socket,
    { roomId, recipient }: { roomId: string; recipient: string },
  ) {
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatRepository.findOne({ where: { id: roomId } });
    if (!chat) return;

    const messages = await this.messageRepository.find({
      where: { chatId: roomId },
      select: [
        'chat',
        'chatId',
        'content',
        'createdAt',
        'forwardedMessage',
        'id',
        'images',
        'isEdited',
        'readed',
        'replyMessage',
        'sender',
        'updatedAt',
        'voiceMessage',
      ],
    });

    messages?.map((el) => {
      if (!el.readed?.includes(sender)) {
        if (!el.readed) el.readed = [];
        el.readed.push(sender);
      }
    });

    await this.messageRepository.save(messages);

    client.to(recipientSocket).emit('read-messages', roomId);
  }

  @SubscribeMessage('delete-message')
  async deleteMessage(
    client: Socket,
    {
      messageId,
      roomId,
      recipient,
    }: { roomId: string; recipient: string; messageId: string },
  ) {
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatRepository.findOne({
      where: { id: roomId },
      relations: ['messages'],
    });
    if (!chat) return;

    const message = chat.messages.find((msg) => msg.id === messageId);

    await this.messageRepository.delete(messageId);
    chat.messages = chat.messages.filter((message) => message.id !== messageId);
    await this.chatRepository.save(chat);

    client.emit('delete-message', message);
    client.to(recipientSocket).emit('delete-message', message);
  }

  @SubscribeMessage('edit-message')
  async editMessage(
    client: Socket,
    {
      messageId,
      roomId,
      recipient,
      content,
    }: {
      roomId: string;
      recipient: string;
      messageId: string;
      content: string;
    },
  ) {
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatRepository.findOne({ where: { id: roomId } });
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });
    if (!chat || !message) return;

    message.content = content;
    message.isEdited = true;
    const updatedMessage = await this.messageRepository.save(message);

    client.emit('edit-message', updatedMessage);
    client.to(recipientSocket).emit('edit-message', updatedMessage);
  }

  @SubscribeMessage('delete-chat')
  async deleteChat(
    client: Socket,
    { roomId, recipient }: { roomId: string; recipient: string },
  ) {
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatRepository.findOne({ where: { id: roomId } });
    if (!chat) return;

    const deletedChat = await this.chatService.deleteChat(
      roomId,
      sender,
      recipient,
    );

    client.emit('delete-chat', deletedChat);
    client.to(recipientSocket).emit('delete-chat', deletedChat);
  }
}
