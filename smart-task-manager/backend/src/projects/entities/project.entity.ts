import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ProjectMember } from './project-member.entity';
import { Task } from '../../tasks/entities/task.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => ProjectMember, (member) => member.project, {
    cascade: true,
  })
  members: ProjectMember[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
