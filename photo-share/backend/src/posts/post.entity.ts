import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Reaction } from '../reactions/reaction.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl!: string;

  // S3 object key for the original image
  @Column({ type: 'varchar', length: 500, nullable: true })
  imageKey!: string | null;

  // Pre-computed thumbnail URL for fast feed loading
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  caption!: string;

  @Column({ type: 'varchar', length: 50, default: 'none' })
  filter!: string;

  @Index()
  @Column({ type: 'bigint' })
  userId!: number;

  // Denormalized reaction count for fast feed rendering
  @Column({ type: 'int', default: 0 })
  reactionCount!: number;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => Reaction, (reaction) => reaction.post)
  reactions!: Reaction[];

  @Index()
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
