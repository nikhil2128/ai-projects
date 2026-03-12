import { Test, TestingModule } from '@nestjs/testing';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { CreateExportDto, ExportStatusResponseDto } from './dto';
import { ExportStatus, PaginationStrategy } from './enums';

describe('ExportsController', () => {
  let controller: ExportsController;
  let service: jest.Mocked<ExportsService>;

  const mockDate = new Date('2026-01-15T10:00:00Z');

  const mockResponse: ExportStatusResponseDto = {
    id: 'test-uuid-1',
    status: ExportStatus.PENDING,
    totalRecords: 0,
    pagesProcessed: 0,
    downloadUrl: null,
    errorMessage: null,
    createdAt: mockDate,
    startedAt: null,
    completedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportsController],
      providers: [
        {
          provide: ExportsService,
          useValue: {
            createExport: jest.fn(),
            getExportStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ExportsController>(ExportsController);
    service = module.get(ExportsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createExport', () => {
    it('should delegate to service and return the response', async () => {
      const dto: CreateExportDto = {
        apiUrl: 'https://api.example.com/data',
        email: 'user@example.com',
      };

      service.createExport.mockResolvedValue(mockResponse);

      const result = await controller.createExport(dto);

      expect(service.createExport).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResponse);
    });

    it('should pass all DTO fields to the service', async () => {
      const dto: CreateExportDto = {
        apiUrl: 'https://api.example.com/orders',
        email: 'admin@corp.com',
        paginationStrategy: PaginationStrategy.OFFSET,
        headers: { 'X-API-Key': 'key123' },
        queryParams: { filter: 'active' },
        pageSize: 200,
        dataPath: 'response.data',
        cursorPath: 'next_cursor',
        cursorParam: 'cursor',
        fileName: 'orders-export',
      };

      service.createExport.mockResolvedValue({
        ...mockResponse,
        id: 'new-uuid',
      });

      const result = await controller.createExport(dto);

      expect(service.createExport).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('new-uuid');
    });
  });

  describe('getExportStatus', () => {
    it('should return the export status', async () => {
      const completedResponse: ExportStatusResponseDto = {
        ...mockResponse,
        status: ExportStatus.COMPLETED,
        totalRecords: 5000,
        pagesProcessed: 10,
        downloadUrl: 'https://s3.example.com/download',
        completedAt: new Date('2026-01-15T10:05:00Z'),
      };

      service.getExportStatus.mockResolvedValue(completedResponse);

      const result = await controller.getExportStatus('test-uuid-1');

      expect(service.getExportStatus).toHaveBeenCalledWith('test-uuid-1');
      expect(result).toEqual(completedResponse);
    });
  });
});
