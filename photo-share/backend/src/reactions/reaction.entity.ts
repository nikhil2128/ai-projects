import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';

@Entity('reactions')
@Unique(['userId', 'postId', 'emoji'])
@Index(['postId'])
@Index(['userId', 'postId'])
export class Reaction {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 10 })
  emoji!: string;

  @Column({ type: 'bigint' })
  userId!: number;

  @Column({ type: 'bigint' })
  postId!: number;

  @ManyToOne(() => User, (user) => user.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Post, (post) => post.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: Post;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
