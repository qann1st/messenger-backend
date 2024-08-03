import { Exclude } from 'class-transformer';
import { Document, RefType, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { User } from '~modules/users/users.schema';

import { Message } from './message.schema';

export type ChatDocument = Chat & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      delete ret._id;
    },
  },
  timestamps: true,
  versionKey: false,
})
export class Chat {
  @ApiProperty({ type: String })
  id: string;
  @Exclude()
  _id: string;
  @ApiProperty({ type: [User] })
  @Prop({ default: [], type: [Types.ObjectId], ref: 'User' })
  users: RefType[];
  @ApiProperty({ type: [Message] })
  @Prop({ default: [], type: [Types.ObjectId], ref: 'Message' })
  messages: string[];
  @Prop()
  createdAt: number;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
