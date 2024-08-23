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
import { UpdateUserDto } from '~modules/users/dto/update-user.dto';
import { User } from '~modules/users/users.entity';
import { UsersService } from '~modules/users/users.service';

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
    private usersService: UsersService,
    private uploadService: UploadService,
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT) ?? 32768,
      connectionName: 'chat',
    });
  }

  private async getUserFromSocket(client: Socket) {
    const token = client.handshake.auth['token'];
    if (!token) return null;

    try {
      const jwtUser = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      return jwtUser?._id ? jwtUser : null;
    } catch (err) {
      console.error('Error verifying token:', err);
      return null;
    }
  }

  private async getUserAndRelations(userId: string) {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['dialogs', 'dialogs.users'],
    });
  }

  private async updateUserStatus(userId: string, isOnline: boolean) {
    const updateFields = { isOnline };
    if (!isOnline) {
      updateFields['lastOnline'] = new Date().getTime();
    }
    await this.userRepository.update(userId, updateFields);
  }

  private async notifyDialogUsers(user: User, event: string, data: any) {
    const userDialogs = user.dialogs ?? [];
    for (const dialog of userDialogs) {
      const recipient = dialog.users.find((u) => u.id !== user.id);
      if (recipient) {
        const recipientSocket = await this.redisClient.get(
          String(recipient.id),
        );

        if (recipientSocket) {
          this.server.to(recipientSocket).emit(event, data);
        }
      }
    }
  }

  async handleConnection(client: Socket) {
    const jwtUser = await this.getUserFromSocket(client);
    if (!jwtUser) return client.disconnect();

    const userId = jwtUser._id;

    await Promise.all([
      this.redisClient.set(userId, client.id),
      this.redisClient.set(client.id, userId),
    ]);

    const user = await this.getUserAndRelations(userId);
    if (!user) return;

    await this.updateUserStatus(userId, true);
    await this.notifyDialogUsers(user, 'online', { userId });
  }

  async handleDisconnect(client: Socket) {
    const jwtUser = await this.getUserFromSocket(client);
    if (!jwtUser) return;

    const userId = jwtUser._id;

    await Promise.all([
      this.redisClient.del(userId),
      this.redisClient.del(client.id),
    ]);

    const user = await this.getUserAndRelations(userId);
    if (!user) return;

    await this.updateUserStatus(userId, false);
    await this.notifyDialogUsers(user, 'offline', {
      userId,
      lastOnline: new Date().getTime(),
    });
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, messageDto: MessageDto) {
    const {
      id,
      content,
      forwardedMessage,
      recipient,
      replyMessage,
      chatId,
      images,
      voiceMessage,
      size,
    } = messageDto;

    const sender = await this.redisClient.get(client.id);
    const [recipientSocket, chat, senderUser] = await Promise.all([
      this.redisClient.get(recipient),
      this.chatRepository.findOne({ where: { id: chatId } }),
      this.userRepository.findOne({ where: { id: sender } }),
    ]);

    if (
      !chat ||
      (!content && !images && !voiceMessage) ||
      !recipient ||
      !sender
    )
      return;

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

      const [newFiles] = await Promise.all([
        this.uploadService.filterFiles([file]),
      ]);
      const uploadedFiles = await this.uploadService.uploadFile(newFiles);
      fileUrl = uploadedFiles[0] as string;
    }

    const message = this.messageRepository.create({
      id,
      forwardedMessage,
      voiceMessage: fileUrl,
      replyMessage,
      content,
      sender: senderUser,
      chatId,
      readed: [sender],
      images,
    });

    const savedMessage = await this.messageRepository.save(message);
    const msg = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['replyMessage', 'forwardedMessage'],
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

    const chat = await this.chatRepository.findOne({
      where: { id: roomId },
      relations: ['messages'],
    });

    if (!chat) return;

    const messagesToUpdate = chat.messages
      .filter((message) => message.chatId === roomId)
      .map((message) => {
        if (!message.readed?.includes(sender)) {
          message.readed = message.readed || [];
          message.readed.push(sender);
        }
        return message;
      });

    if (messagesToUpdate.length === 0) return;

    for (const message of messagesToUpdate) {
      if (
        message.chatId === roomId &&
        (!message.readed || !message.readed.includes(sender))
      ) {
        message.readed = message.readed || [];
        if (!message.readed.includes(sender)) {
          message.readed.push(sender);
        }

        await this.messageRepository.save(message);
      }
    }

    client.to(recipientSocket).emit('read-messages', roomId);
  }

  @SubscribeMessage('update-user')
  async updateUser(client: Socket, updateUser: UpdateUserDto) {
    const sender = await this.redisClient.get(client.id);

    const user = await this.usersService.update(sender, updateUser);

    client.emit('update-user', user);
    await this.notifyDialogUsers(
      await this.usersService.findById(sender),
      'update-user',
      user,
    );
  }

  @SubscribeMessage('print')
  async startPrint(
    client: Socket,
    {
      roomId,
      recipient,
      startPrint,
    }: { roomId: string; recipient: string; startPrint: boolean },
  ) {
    const sender = await this.redisClient.get(client.id);
    const recipientSocket = await this.redisClient.get(recipient);

    client
      .to(recipientSocket)
      .emit('print', { roomId, sender, printing: startPrint });
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
      relations: [
        'messages',
        'messages.replyMessage',
        'messages.forwardedMessage',
      ],
    });

    if (!chat) return;

    const message = chat.messages.find((msg: any) => msg.id === messageId);

    if (message) {
      const messagesToUpdate = chat.messages.filter(
        (msg: any) =>
          msg.replyMessage?.id === messageId ||
          msg.forwardedMessage?.id === messageId,
      );

      if (messagesToUpdate.length > 0) {
        await Promise.all(
          messagesToUpdate.map(async (msg: any) => {
            try {
              if (msg.replyMessage?.id === messageId) {
                msg.replyMessage = null;
              }
              if (msg.forwardedMessage?.id === messageId) {
                msg.forwardedMessage = null;
              }
              await this.messageRepository.save(msg);
            } catch (err) {
              console.error(err);
            }
          }),
        );
      }

      await this.messageRepository.delete(messageId);

      chat.messages = chat.messages.filter((msg) => msg.id !== messageId);
      await this.chatRepository.save(chat);

      client.emit('delete-message', message);
      client.to(recipientSocket).emit('delete-message', message);
    }
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
