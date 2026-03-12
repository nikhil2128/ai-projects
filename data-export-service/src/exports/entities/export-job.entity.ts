import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExportStatus } from '../enums';
import { PaginationStrategy } from '../enums';

@Entity('export_jobs')
export class ExportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ExportStatus, default: ExportStatus.PENDING })
  status!: ExportStatus;

  @Column()
  apiUrl!: string;

  @Column()
  email!: string;

  @Column({ type: 'enum', enum: PaginationStrategy, default: PaginationStrategy.PAGE })
  paginationStrategy!: PaginationStrategy;

  @Column({ type: 'jsonb', nullable: true })
  headers!: Record<string, string> | null;

  @Column({ type: 'jsonb', nullable: true })
  queryParams!: Record<string, string> | null;

  @Column({ default: 500 })
  pageSize!: number;

  /** JSON path to the data array in the API response (e.g. "data", "results", "data.items") */
  @Column({ default: 'data' })
  dataPath!: string;

  /** For cursor-based pagination: JSON path to the next cursor in the response */
  @Column({ nullable: true })
  cursorPath!: string | null;

  /** Query parameter name for cursor value */
  @Column({ nullable: true })
  cursorParam!: string | null;

  @Column({ nullable: true })
  fileName!: string | null;

  @Column({ nullable: true })
  s3Key!: string | null;

  @Column({ nullable: true })
  downloadUrl!: string | null;

  @Column({ default: 0 })
  totalRecords!: number;

  @Column({ default: 0 })
  pagesProcessed!: number;

  @Column({ nullable: true })
  errorMessage!: string | null;

  @Column({ default: 0 })
  attempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
