import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Reaction } from '../reactions/reaction.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  imageUrl!: string;

  @Column({ nullable: true })
  caption!: string;

  @Column({ default: 'none' })
  filter!: string;

  @Column()
  userId!: number;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => Reaction, (reaction) => reaction.post)
  reactions!: Reaction[];

  @CreateDateColumn()
  createdAt!: Date;
}
