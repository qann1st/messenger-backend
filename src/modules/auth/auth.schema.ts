import { Exclude, Type } from 'class-transformer';
import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { User } from '~modules/users/users.schema';

export type AuthDocument = Auth & Document;

@Schema({
  toJSON: {
    virtuals: true,
  },
  versionKey: false,
})
export class Auth {
  @Exclude()
  _id: string;
  @Exclude()
  __v: number;
  @Type(() => User)
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true })
  user: User;
  @Prop({ type: Array<string>, default: [] })
  refreshTokens: Array<string>;
}

export const AuthSchema = SchemaFactory.createForClass(Auth);
