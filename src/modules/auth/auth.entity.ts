// auth.entity.ts
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '~modules/users/users.entity';

@Entity('auth')
export class Auth {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user, { eager: true })
  @JoinColumn()
  user: User;

  @Column('text', { array: true, default: [] })
  refreshTokens: string[];
}
