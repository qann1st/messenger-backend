import { Exclude, Type } from 'class-transformer';
import { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { User } from '~modules/users/users.schema';

export type MessageDocument = Message & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      delete ret._id;
    },
  },
  versionKey: false,
  timestamps: true,
})
export class Message {
  @ApiProperty({ type: String })
  id: string;
  @Exclude()
  _id: string;
  @ApiProperty({ type: User })
  @Type(() => Types.ObjectId)
  @Prop({ required: true, ref: 'User' })
  sender: string;
  @ApiProperty({ type: String })
  @Prop({ required: true, minlength: 1, maxlength: 1000 })
  content: string;
  @ApiProperty({ type: String })
  @Type(() => Types.ObjectId)
  @Prop()
  replyMessage: string;
  @ApiProperty({ type: String })
  @Type(() => Types.ObjectId)
  @Prop()
  forwardedMessage: string;
  @ApiProperty({ type: Date })
  @Prop()
  createdAt: Date;
  @ApiProperty({ type: Date })
  @Prop()
  updatedAt: Date;
  @ApiProperty({ type: String })
  @Prop({ required: true })
  chatId: string;
  @ApiProperty({ type: Boolean })
  @Prop({ default: false })
  isEdited: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
