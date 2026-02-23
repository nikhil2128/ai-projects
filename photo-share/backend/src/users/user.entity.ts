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
import { ProfileVerificationStatus } from './profile-verification-status.enum';

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FLAGGED = 'flagged',
  RESTRICTED = 'restricted',
}

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

  @Column({ type: 'varchar', length: 30, default: ProfileVerificationStatus.VERIFIED })
  verificationStatus!: ProfileVerificationStatus;

  @Column({ type: 'int', default: 0 })
  verificationScore!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  verificationReasons!: string | null;

  @Index()
  @Column({ type: 'boolean', default: true })
  isDiscoverable!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

  @Index()
  @Column({
    type: 'varchar',
    length: 20,
    default: VerificationStatus.PENDING,
  })
  verificationStatus!: VerificationStatus;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  emailVerificationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpiry!: Date | null;

  @Column({ type: 'int', default: 0 })
  verificationScore!: number;

  @Column({ type: 'simple-json', nullable: true })
  verificationChecks!: Record<string, { score: number; passed: boolean; detail: string }> | null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt!: Date | null;

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
