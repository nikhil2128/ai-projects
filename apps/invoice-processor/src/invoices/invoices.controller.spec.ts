import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceStatus } from './enums';

describe('InvoicesController', () => {
  let controller: InvoicesController;
  let service: jest.Mocked<InvoicesService>;

  const mockInvoicesService = {
    uploadInvoice: jest.fn(),
    getInvoiceStatus: jest.fn(),
    searchInvoices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        {
          provide: InvoicesService,
          useValue: mockInvoicesService,
        },
      ],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
    service = module.get(InvoicesService) as jest.Mocked<InvoicesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadInvoice', () => {
    it('should accept a PDF file and return accepted response', async () => {
      const mockFile = {
        originalname: 'test-invoice.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('fake pdf'),
        size: 1024,
      } as Express.Multer.File;

      const expectedResponse = {
        id: 'uuid-123',
        originalFilename: 'test-invoice.pdf',
        status: InvoiceStatus.PENDING,
        createdAt: new Date(),
        message: 'Invoice uploaded successfully. Processing has been queued.',
      };

      service.uploadInvoice.mockResolvedValue(expectedResponse);

      const result = await controller.uploadInvoice(mockFile);

      expect(result).toEqual(expectedResponse);
      expect(service.uploadInvoice).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('getInvoiceStatus', () => {
    it('should return invoice status for a valid ID', async () => {
      const expectedResponse = {
        id: 'uuid-123',
        originalFilename: 'test-invoice.pdf',
        status: InvoiceStatus.COMPLETED,
        attempts: 1,
        vendorName: 'Acme Corp',
        amount: 1500.0,
        tax: 150.0,
        dueDate: new Date('2024-03-15'),
        confidence: 0.85,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        processedAt: new Date(),
      };

      service.getInvoiceStatus.mockResolvedValue(expectedResponse);

      const result = await controller.getInvoiceStatus('uuid-123');

      expect(result).toEqual(expectedResponse);
      expect(service.getInvoiceStatus).toHaveBeenCalledWith('uuid-123');
    });
  });

  describe('searchInvoices', () => {
    it('should search invoices with query parameters', async () => {
      const query = { vendorName: 'Acme', page: 1, limit: 20, sortBy: 'createdAt' as const, sortOrder: 'DESC' as const };
      const expectedResponse = {
        data: [
          {
            id: 'uuid-123',
            originalFilename: 'test-invoice.pdf',
            vendorName: 'Acme Corp',
            amount: 1500.0,
            tax: 150.0,
            dueDate: new Date('2024-03-15'),
            status: InvoiceStatus.COMPLETED,
            createdAt: new Date(),
            processedAt: new Date(),
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      service.searchInvoices.mockResolvedValue(expectedResponse);

      const result = await controller.searchInvoices(query);

      expect(result).toEqual(expectedResponse);
      expect(service.searchInvoices).toHaveBeenCalledWith(query);
    });
  });
});
