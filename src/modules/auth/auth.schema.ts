import { Exclude, Type } from 'class-transformer';
import mongoose, { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { User } from '~modules/users/users.schema';

export type AuthDocument = Auth & Document;

@Schema({
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  },
  versionKey: false,
})
export class Auth {
  @ApiProperty({ type: String })
  id: string;
  @Exclude()
  _id: Types.ObjectId;
  @ApiProperty({ type: User })
  @Type(() => User)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true })
  user: User;
  @ApiProperty({ type: String })
  @Prop({ type: Array<string>, default: [] })
  refreshTokens: string[];
}

export const AuthSchema = SchemaFactory.createForClass(Auth);
