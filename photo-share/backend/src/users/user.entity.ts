import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Post } from '../posts/post.entity';
import { Reaction } from '../reactions/reaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ nullable: true })
  displayName!: string;

  @Column({ nullable: true })
  bio!: string;

  @Column({ nullable: true })
  avatarUrl!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Post, (post) => post.user)
  posts!: Post[];

  @OneToMany(() => Reaction, (reaction) => reaction.user)
  reactions!: Reaction[];
}
