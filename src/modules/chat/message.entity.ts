import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ type: String })
  replyMessage: string;

  @Column({ type: 'uuid', nullable: true })
  @ApiProperty({ type: String })
  forwardedMessage: string;

  @CreateDateColumn()
  @ApiProperty({ type: Date })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ type: Date })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: false })
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
