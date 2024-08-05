import { Redis } from 'ioredis';
import { Model } from 'mongoose';
import type { Server, Socket } from 'socket.io';

import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { MFile } from '~modules/upload/mfile.class';
import { UploadService } from '~modules/upload/upload.service';
import { User, UserDocument } from '~modules/users/users.schema';

import { Chat, ChatDocument } from './chat.schema';
import { ChatService } from './chat.service';
import { MessageDto } from './dto/message.dto';
import { Message, MessageDocument } from './message.schema';

@WebSocketGateway(8080, {
  namespace: 'chat',
  cors: true,
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private redisClient: Redis;

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
      if (!client.handshake.auth['token']) return client.disconnect();
      const jwtUser = await this.jwtService.verifyAsync(
        client.handshake.auth['token'],
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
      if (!jwtUser._id) return;
      await this.redisClient.set(jwtUser._id, client.id);
      await this.redisClient.set(client.id, jwtUser._id);

      const user = await this.userModel
        .findByIdAndUpdate(jwtUser._id, { isOnline: true })
        .populate('dialogs');

      user.dialogs.forEach(async (el: any) => {
        const recipient = el.users.find((id) => id !== user.id);
        const userId = await this.redisClient.get(String(recipient));
        if (userId) {
          client.to(userId).emit('online', el.id);
        }
      });
    } catch {}
  }

  async handleDisconnect(client: Socket) {
    try {
      if (!client.handshake.auth['token']) return client.disconnect();
      const jwtUser = await this.jwtService.verifyAsync(
        client.handshake.auth['token'],
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
      if (!jwtUser._id) return;
      await this.redisClient.del(jwtUser._id, client.id);
      await this.redisClient.del(client.id, jwtUser._id);

      const user = await this.userModel
        .findByIdAndUpdate(
          jwtUser._id,
          {
            isOnline: false,
            lastOnline: new Date().getTime(),
          },
          { new: true },
        )
        .populate('dialogs');

      user.dialogs.forEach(async (el: any) => {
        const recipient = el.users.find((id) => {
          return id !== user.id;
        });
        const userId = await this.redisClient.get(String(recipient));
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
    const chat = await this.chatModel.findByIdAndUpdate(chatId);
    if (!chat) return;
    if (!chat.users.includes(sender)) return;
    if (!chat.users.includes(recipient)) return;

    if (!content && !images && !voiceMessage) {
      return;
    }

    if (!recipient) return;
    if (!sender) return;
    const recipientUser = await this.userModel.findById(recipient);
    if (!recipientUser.dialogs.includes(chatId)) {
      await recipientUser.updateOne({
        $addToSet: { dialogs: chatId },
      });
    }

    if (voiceMessage) {
      const file = new MFile({
        buffer: voiceMessage,
        mimetype: 'audio/ogg; codecs=opus',
        originalname: 'voice.ogg',
        size,
      } as MFile);

      const newFiles = await this.uploadService.filterFiles([file]);
      const fileUrl = await this.uploadService.uploadFile(newFiles);

      const message = await this.messageModel.create({
        forwardedMessage,
        voiceMessage: fileUrl[0],
        replyMessage,
        content,
        sender,
        chatId,
      });
      const populatedMessage = await message.populate('sender');
      await this.chatService.addMessage(chatId, message);

      client.emit('message', populatedMessage);
      client.to(recipientSocket).emit('message', populatedMessage);

      return;
    }

    const message = await this.messageModel.create({
      forwardedMessage,
      replyMessage,
      content,
      sender,
      chatId,
      images,
    });
    const populatedMessage = await message.populate('sender');
    await this.chatService.addMessage(chatId, message);

    client.emit('message', populatedMessage);
    client.to(recipientSocket).emit('message', populatedMessage);
  }

  @SubscribeMessage('read-messages')
  async readMessages(
    client,
    { roomId, recipient }: { roomId: string; recipient: string },
  ) {
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatModel.findByIdAndUpdate(roomId);
    if (!chat) return;
    if (!chat.users.includes(sender)) return;
    if (!chat.users.includes(recipient)) return;

    await this.messageModel.updateMany(
      {
        chatId: roomId,
      },
      {
        $addToSet: {
          readed: sender,
        },
      },
    );

    client.emit('read-messages', roomId);
    client.to(recipientSocket).emit('read-messages', roomId);
  }

  @SubscribeMessage('delete-message')
  async deleteMessage(
    client,
    {
      messageId,
      roomId,
      recipient,
    }: { roomId: string; recipient: string; messageId: string },
  ) {
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatModel.findByIdAndUpdate(roomId);
    if (!chat) return;
    if (!chat.users.includes(sender)) return;
    if (!chat.users.includes(recipient)) return;

    await chat.updateOne({ $pull: { messages: messageId } });
    const deletedMessage = await this.messageModel.findByIdAndDelete(messageId);

    client.emit('delete-message', deletedMessage);
    client.to(recipientSocket).emit('delete-message', deletedMessage);
  }

  @SubscribeMessage('edit-message')
  async editMessage(
    client,
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
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatModel.findByIdAndUpdate(roomId);
    const message = await this.messageModel.findById(messageId);
    if (!chat) return;
    if (!chat.users.includes(sender)) return;
    if (!chat.users.includes(recipient)) return;
    if (message.sender !== sender) return;

    const editMessage = await this.messageModel
      .findByIdAndUpdate(messageId, { content, isEdited: true }, { new: true })
      .populate('sender');

    client.emit('edit-message', editMessage);
    client.to(recipientSocket).emit('edit-message', editMessage);
  }

  @SubscribeMessage('delete-chat')
  async deleteChat(
    client,
    { roomId, recipient }: { roomId: string; recipient: string },
  ) {
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);
    const chat = await this.chatModel.findByIdAndUpdate(roomId);
    if (!chat) return;
    if (!chat.users.includes(sender)) return;
    if (!chat.users.includes(recipient)) return;

    const deletedChat = await this.chatService.deleteChat(
      roomId,
      sender,
      recipient,
    );

    client.emit('delete-chat', deletedChat);
    client.to(recipientSocket).emit('delete-chat', deletedChat);
  }
}
