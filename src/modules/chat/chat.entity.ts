import {
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

import { User } from '~modules/users/users.entity';

import { Message } from './message.entity';

@Entity()
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ type: String })
  id: string;

  @ManyToMany(() => User, (user) => user.dialogs)
  @JoinTable()
  @ApiProperty({ type: [User] })
  users: User[];

  @OneToMany(() => Message, (message) => message.chat, { cascade: true })
  @ApiProperty({ type: [Message] })
  messages: Message[];

  @CreateDateColumn()
  @ApiProperty({ type: Date })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ type: Date })
  updatedAt: Date;
}
