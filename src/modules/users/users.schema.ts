import { Exclude } from 'class-transformer';
import { Document, RefType, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { Chat } from '~modules/chat/chat.schema';

export type UserDocument = User & Document;

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
export class User {
  @ApiProperty({ type: String })
  id: string;
  @Exclude()
  _id: Types.ObjectId;
  @ApiProperty({ type: String })
  @Prop({ maxlength: 32, required: true })
  firstname: string;
  @ApiProperty({ type: String })
  @Prop({ maxlength: 32 })
  lastname: string;
  @ApiProperty({ type: String })
  @Prop({ required: true, unique: true, lowercase: true, select: false })
  email: string;
  @ApiProperty({ type: String })
  @Prop({ unique: true, lowercase: true })
  username: string;
  @Prop({ select: false })
  approveCode: string;
  @Prop({ select: false })
  signInCode: string;
  @Prop({ select: false })
  signInCodeTimestamp: number;
  @ApiProperty({ type: Boolean })
  @Prop({ default: false })
  isOnline: boolean;
  @ApiProperty({ type: Number })
  @Prop({ default: Date.now() })
  lastOnline: number;
  @ApiProperty({ type: [Chat] })
  @Prop({ default: [], type: [Types.ObjectId], ref: 'Chat' })
  dialogs: RefType[];
  @ApiProperty({ type: Date })
  @Prop()
  createdAt: Date;
  @ApiProperty({ type: Date })
  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
