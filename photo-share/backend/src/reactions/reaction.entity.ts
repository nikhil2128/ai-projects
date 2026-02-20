import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Post } from '../posts/post.entity';

@Entity('reactions')
@Unique(['userId', 'postId', 'emoji'])
export class Reaction {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  emoji!: string;

  @Column()
  userId!: number;

  @Column()
  postId!: number;

  @ManyToOne(() => User, (user) => user.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Post, (post) => post.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: Post;

  @CreateDateColumn()
  createdAt!: Date;
}
