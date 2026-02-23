import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Post } from '../posts/post.entity';
import { Reaction } from '../reactions/reaction.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Index()
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  displayName!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl!: string;

  @Index()
  @Column({ type: 'float', nullable: true })
  latitude!: number | null;

  @Index()
  @Column({ type: 'float', nullable: true })
  longitude!: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  locationName!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  locationUpdatedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => Post, (post) => post.user)
  posts!: Post[];

  @OneToMany(() => Reaction, (reaction) => reaction.user)
  reactions!: Reaction[];
}
