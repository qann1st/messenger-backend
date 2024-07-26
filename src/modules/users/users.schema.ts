import { Exclude } from 'class-transformer';
import { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({
  toJSON: {
    virtuals: false,
  },
  timestamps: true,
  versionKey: false,
})
export class User {
  @ApiProperty({ type: String })
  id: string;
  @Exclude()
  _id: string;
  @ApiProperty({ type: String })
  @Prop({ maxlength: 32 })
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
  @Prop()
  createdAt: Date;
  @Prop()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
