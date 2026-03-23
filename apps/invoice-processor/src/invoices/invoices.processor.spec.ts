import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesProcessor } from './invoices.processor';
import { InvoicesService } from './invoices.service';
import { ExtractionService } from '../extraction/extraction.service';
import { InvoiceStatus } from './enums';
import { Job } from 'bullmq';

describe('InvoicesProcessor', () => {
  let processor: InvoicesProcessor;
  let invoicesService: jest.Mocked<InvoicesService>;
  let extractionService: jest.Mocked<ExtractionService>;

  const mockInvoicesService = {
    findById: jest.fn(),
    updateInvoice: jest.fn(),
  };

  const mockExtractionService = {
    extractFromPdf: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesProcessor,
        { provide: InvoicesService, useValue: mockInvoicesService },
        { provide: ExtractionService, useValue: mockExtractionService },
      ],
    }).compile();

    processor = module.get<InvoicesProcessor>(InvoicesProcessor);
    invoicesService = module.get(InvoicesService) as jest.Mocked<InvoicesService>;
    extractionService = module.get(ExtractionService) as jest.Mocked<ExtractionService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should skip processing if invoice is not found in DB', async () => {
    mockInvoicesService.findById.mockResolvedValue(null);

    const job = {
      data: { invoiceId: 'nonexistent-id' },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job;

    await processor.process(job);

    expect(mockInvoicesService.updateInvoice).toHaveBeenCalledWith(
      'nonexistent-id',
      expect.objectContaining({ status: InvoiceStatus.PROCESSING }),
    );
    expect(mockExtractionService.extractFromPdf).not.toHaveBeenCalled();
  });

  it('should mark invoice as FAILED on last attempt error', async () => {
    const invoice = {
      id: 'uuid-123',
      filePath: '/tmp/test.pdf',
    };

    mockInvoicesService.findById.mockResolvedValue(invoice as any);
    mockExtractionService.extractFromPdf.mockRejectedValue(new Error('PDF corrupt'));

    // Mock fs.readFile
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.spyOn(require('fs/promises'), 'readFile').mockResolvedValue(Buffer.from('fake'));

    const job = {
      data: { invoiceId: 'uuid-123' },
      attemptsMade: 2, // 0-indexed, so this is the 3rd attempt
      opts: { attempts: 3 },
    } as unknown as Job;

    await expect(processor.process(job)).rejects.toThrow('PDF corrupt');

    expect(mockInvoicesService.updateInvoice).toHaveBeenCalledWith(
      'uuid-123',
      expect.objectContaining({
        status: InvoiceStatus.FAILED,
        errorMessage: expect.stringContaining('PDF corrupt'),
      }),
    );
  });
});
