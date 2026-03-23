import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InvoicesService, INVOICE_QUEUE_NAME } from './invoices.service';
import { Invoice } from './entities/invoice.entity';
import { InvoiceStatus } from './enums';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let repo: jest.Mocked<Repository<Invoice>>;
  let queue: { add: jest.Mock };

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        UPLOAD_DIR: '/tmp/test-uploads',
        QUEUE_MAX_RETRIES: 3,
        QUEUE_RETRY_DELAY_MS: 5000,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: mockRepo },
        { provide: getQueueToken(INVOICE_QUEUE_NAME), useValue: mockQueue },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    repo = module.get(getRepositoryToken(Invoice));
    queue = module.get(getQueueToken(INVOICE_QUEUE_NAME));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadInvoice', () => {
    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        service.uploadInvoice(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-PDF files', async () => {
      const file = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from('test'),
        size: 4,
      } as Express.Multer.File;

      await expect(service.uploadInvoice(file)).rejects.toThrow(BadRequestException);
    });

    it('should upload a PDF and enqueue a processing job', async () => {
      const file = {
        originalname: 'invoice.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 fake content'),
        size: 2048,
      } as Express.Multer.File;

      const savedInvoice = {
        id: 'uuid-123',
        originalFilename: 'invoice.pdf',
        filePath: '/tmp/test-uploads/uuid.pdf',
        status: InvoiceStatus.PENDING,
        createdAt: new Date(),
      };

      mockRepo.create.mockReturnValue(savedInvoice);
      mockRepo.save.mockResolvedValue(savedInvoice);
      mockQueue.add.mockResolvedValue({});

      const result = await service.uploadInvoice(file);

      expect(result.id).toBe('uuid-123');
      expect(result.status).toBe(InvoiceStatus.PENDING);
      expect(result.message).toContain('uploaded successfully');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process-invoice',
        { invoiceId: 'uuid-123' },
        expect.objectContaining({
          jobId: 'uuid-123',
          attempts: 3,
        }),
      );
    });
  });

  describe('getInvoiceStatus', () => {
    it('should throw NotFoundException for unknown invoice ID', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.getInvoiceStatus('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return invoice status for valid ID', async () => {
      const invoice = {
        id: 'uuid-123',
        originalFilename: 'invoice.pdf',
        status: InvoiceStatus.COMPLETED,
        attempts: 1,
        vendorName: 'Acme Corp',
        amount: 1500,
        tax: 150,
        dueDate: new Date('2024-03-15'),
        confidence: 0.85,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        processedAt: new Date(),
      };

      mockRepo.findOne.mockResolvedValue(invoice);

      const result = await service.getInvoiceStatus('uuid-123');

      expect(result.id).toBe('uuid-123');
      expect(result.vendorName).toBe('Acme Corp');
      expect(result.status).toBe(InvoiceStatus.COMPLETED);
    });
  });

  describe('searchInvoices', () => {
    it('should return paginated results', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'uuid-1',
              originalFilename: 'inv1.pdf',
              vendorName: 'Acme',
              amount: 100,
              tax: 10,
              dueDate: new Date('2024-01-01'),
              status: InvoiceStatus.COMPLETED,
              createdAt: new Date(),
              processedAt: new Date(),
            },
          ],
          1,
        ]),
      };

      mockRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.searchInvoices({
        vendorName: 'Acme',
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'LOWER(invoice.vendorName) LIKE LOWER(:vendorName)',
        { vendorName: '%Acme%' },
      );
    });
  });
});
