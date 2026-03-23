import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { InvoiceStatus } from '../enums';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Original filename of the uploaded PDF */
  @Column()
  originalFilename: string;

  /** Path where the PDF is stored on disk / object storage */
  @Column()
  filePath: string;

  /** MIME type of the uploaded file */
  @Column({ default: 'application/pdf' })
  mimeType: string;

  /** File size in bytes */
  @Column({ type: 'bigint', default: 0 })
  fileSize: number;

  // ── Extracted Fields ──────────────────────────────────────────────

  @Index()
  @Column({ type: 'varchar', nullable: true })
  vendorName: string | null;

  @Index()
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  amount: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  tax: number | null;

  @Index()
  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  // ── Processing State ──────────────────────────────────────────────

  @Index()
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PENDING,
  })
  status: InvoiceStatus;

  /** Number of processing attempts so far */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  /** Human-readable error message on failure */
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  /** Raw text extracted from the PDF (useful for debugging) */
  @Column({ type: 'text', nullable: true })
  rawText: string | null;

  /** Confidence score of the extraction (0-1) */
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidence: number | null;

  // ── Timestamps ────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date | null;
}
