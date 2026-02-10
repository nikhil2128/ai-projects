import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums';
import {
  UploadInvoiceResponseDto,
  InvoiceStatusResponseDto,
  SearchInvoicesDto,
  SearchInvoicesResponseDto,
} from './dto';

export const INVOICE_QUEUE_NAME = 'invoice-processing';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,

    @InjectQueue(INVOICE_QUEUE_NAME)
    private readonly invoiceQueue: Queue,

    private readonly configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
  }

  // ── Upload ──────────────────────────────────────────────────────────

  async uploadInvoice(file: Express.Multer.File): Promise<UploadInvoiceResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are accepted');
    }

    // Persist file to disk with a unique name
    const fileId = uuidv4();
    const ext = path.extname(file.originalname) || '.pdf';
    const storedFilename = `${fileId}${ext}`;
    const filePath = path.join(this.uploadDir, storedFilename);

    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    // Create invoice record in DB
    const invoice = this.invoiceRepo.create({
      originalFilename: file.originalname,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: InvoiceStatus.PENDING,
    });

    const saved = await this.invoiceRepo.save(invoice);

    // Enqueue processing job
    const maxRetries = this.configService.get<number>('QUEUE_MAX_RETRIES', 3);
    const retryDelay = this.configService.get<number>('QUEUE_RETRY_DELAY_MS', 5000);

    await this.invoiceQueue.add(
      'process-invoice',
      { invoiceId: saved.id },
      {
        jobId: saved.id,
        attempts: maxRetries,
        backoff: {
          type: 'exponential',
          delay: retryDelay,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );

    this.logger.log(`Invoice ${saved.id} uploaded and enqueued for processing`);

    return {
      id: saved.id,
      originalFilename: saved.originalFilename,
      status: saved.status,
      createdAt: saved.createdAt,
      message: 'Invoice uploaded successfully. Processing has been queued.',
    };
  }

  // ── Status ──────────────────────────────────────────────────────────

  async getInvoiceStatus(id: string): Promise<InvoiceStatusResponseDto> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`);
    }

    return {
      id: invoice.id,
      originalFilename: invoice.originalFilename,
      status: invoice.status,
      attempts: invoice.attempts,
      vendorName: invoice.vendorName,
      amount: invoice.amount ? Number(invoice.amount) : null,
      tax: invoice.tax ? Number(invoice.tax) : null,
      dueDate: invoice.dueDate,
      confidence: invoice.confidence ? Number(invoice.confidence) : null,
      errorMessage: invoice.errorMessage,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      processedAt: invoice.processedAt,
    };
  }

  // ── Search ──────────────────────────────────────────────────────────

  async searchInvoices(query: SearchInvoicesDto): Promise<SearchInvoicesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const allowedSortFields = ['createdAt', 'vendorName', 'amount', 'dueDate'];
    if (!allowedSortFields.includes(sortBy)) {
      throw new BadRequestException(`Invalid sortBy field: ${sortBy}`);
    }

    const qb: SelectQueryBuilder<Invoice> = this.invoiceRepo
      .createQueryBuilder('invoice')
      .where('invoice.status = :status', { status: InvoiceStatus.COMPLETED });

    // Vendor name – case-insensitive partial match
    if (query.vendorName) {
      qb.andWhere('LOWER(invoice.vendorName) LIKE LOWER(:vendorName)', {
        vendorName: `%${query.vendorName}%`,
      });
    }

    // Amount filters
    if (query.amount !== undefined) {
      qb.andWhere('invoice.amount = :amount', { amount: query.amount });
    }
    if (query.amountMin !== undefined) {
      qb.andWhere('invoice.amount >= :amountMin', { amountMin: query.amountMin });
    }
    if (query.amountMax !== undefined) {
      qb.andWhere('invoice.amount <= :amountMax', { amountMax: query.amountMax });
    }

    // Due date filters
    if (query.dueDate) {
      qb.andWhere('invoice.dueDate = :dueDate', { dueDate: query.dueDate });
    }
    if (query.dueDateFrom) {
      qb.andWhere('invoice.dueDate >= :dueDateFrom', { dueDateFrom: query.dueDateFrom });
    }
    if (query.dueDateTo) {
      qb.andWhere('invoice.dueDate <= :dueDateTo', { dueDateTo: query.dueDateTo });
    }

    // Ordering and pagination
    qb.orderBy(`invoice.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit);
    qb.take(limit);

    const [items, totalItems] = await qb.getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items.map((inv) => ({
        id: inv.id,
        originalFilename: inv.originalFilename,
        vendorName: inv.vendorName,
        amount: inv.amount ? Number(inv.amount) : null,
        tax: inv.tax ? Number(inv.tax) : null,
        dueDate: inv.dueDate,
        status: inv.status,
        createdAt: inv.createdAt,
        processedAt: inv.processedAt,
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // ── Internal: used by queue processor ──────────────────────────────

  async findById(id: string): Promise<Invoice | null> {
    return this.invoiceRepo.findOne({ where: { id } });
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<void> {
    await this.invoiceRepo.update(id, data);
  }
}
