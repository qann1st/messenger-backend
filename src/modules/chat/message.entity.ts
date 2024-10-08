import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

import { User } from '~modules/users/users.entity';

import { Chat } from './chat.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ type: String })
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'senderId' })
  @ApiProperty({ type: () => User })
  sender: User;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  @ApiProperty({ type: String })
  content: string;

  @Column({ type: 'simple-array', nullable: true })
  @ApiProperty({ type: [String] })
  images: string[];

  @ManyToOne(() => Message)
  @ApiProperty({ type: String })
  replyMessage: string;

  @ManyToOne(() => Message)
  @ApiProperty({ type: String })
  forwardedMessage: string;

  @Column({ type: 'bigint', nullable: false })
  @ApiProperty({
    type: 'number',
    description: 'Created timestamp in milliseconds',
  })
  createdAt: number;

  @Column({ type: 'bigint' })
  @ApiProperty({
    type: 'number',
    description: 'Updated timestamp in milliseconds',
  })
  updatedAt: number;

  @Column({ type: 'uuid' })
  @ApiProperty({ type: String })
  @JoinTable()
  chatId: string;

  @ManyToOne(() => Chat, (chat) => chat.messages)
  chat: Chat;

  @Column({ default: false })
  @ApiProperty({ type: Boolean })
  isEdited: boolean;

  @Column({ type: 'simple-array', nullable: true })
  @ApiProperty({ type: [String] })
  readed: string[];

  @Column({ type: 'varchar', nullable: true })
  @ApiProperty({ type: String })
  voiceMessage: string;
}
