import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ApiProperty } from '@nestjs/swagger';

import { Chat } from '~modules/chat/chat.entity';

@Entity()
export class User {
  @ApiProperty({ type: String })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ type: String })
  @Column({ length: 32 })
  firstname: string;

  @ApiProperty({ type: String })
  @Column({ length: 32, nullable: true })
  lastname: string;

  @ApiProperty({ type: String })
  @Column({ unique: true, nullable: false, select: false })
  email: string;

  @ApiProperty({ type: String })
  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ select: false, nullable: true })
  approveCode: string;

  @Column({ select: false, nullable: true })
  signInCode: string;

  @Column({ type: 'bigint', nullable: true })
  signInCodeTimestamp: number;

  @ApiProperty({ type: Boolean })
  @Column({ default: false })
  isOnline: boolean;

  @ApiProperty({ type: Number })
  @Column({ type: 'bigint', nullable: true })
  lastOnline: number;

  @ApiProperty({ type: [Chat] })
  @ManyToMany(() => Chat)
  @JoinTable()
  dialogs: Chat[];

  @ApiProperty({ type: Date })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: Date })
  @UpdateDateColumn()
  updatedAt: Date;
}
