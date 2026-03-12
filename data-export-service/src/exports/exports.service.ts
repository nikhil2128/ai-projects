import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { ExportJob } from './entities/export-job.entity';
import { CreateExportDto, ExportStatusResponseDto } from './dto';
import { ExportStatus, PaginationStrategy } from './enums';

export const EXPORT_QUEUE_NAME = 'data-export';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @InjectRepository(ExportJob)
    private readonly exportJobRepository: Repository<ExportJob>,

    @InjectQueue(EXPORT_QUEUE_NAME)
    private readonly exportQueue: Queue,

    private readonly configService: ConfigService,
  ) {}

  async createExport(dto: CreateExportDto): Promise<ExportStatusResponseDto> {
    const defaultPageSize = this.configService.get<number>('export.defaultPageSize', 500);

    const job = this.exportJobRepository.create({
      apiUrl: dto.apiUrl,
      email: dto.email,
      paginationStrategy: dto.paginationStrategy ?? PaginationStrategy.PAGE,
      headers: dto.headers ?? null,
      queryParams: dto.queryParams ?? null,
      pageSize: dto.pageSize ?? defaultPageSize,
      dataPath: dto.dataPath ?? 'data',
      cursorPath: dto.cursorPath ?? null,
      cursorParam: dto.cursorParam ?? null,
      fileName: dto.fileName ?? null,
      status: ExportStatus.PENDING,
    });

    const savedJob = await this.exportJobRepository.save(job);
    this.logger.log(`Export job ${savedJob.id} created for ${dto.apiUrl}`);

    await this.exportQueue.add(
      'process-export',
      { exportJobId: savedJob.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800, count: 5000 },
      },
    );

    return this.toResponseDto(savedJob);
  }

  async getExportStatus(id: string): Promise<ExportStatusResponseDto> {
    const job = await this.exportJobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Export job ${id} not found`);
    }
    return this.toResponseDto(job);
  }

  async findById(id: string): Promise<ExportJob | null> {
    return this.exportJobRepository.findOne({ where: { id } });
  }

  async updateJob(id: string, updates: Partial<ExportJob>): Promise<void> {
    await this.exportJobRepository.update(id, updates);
  }

  private toResponseDto(job: ExportJob): ExportStatusResponseDto {
    return {
      id: job.id,
      status: job.status,
      totalRecords: job.totalRecords,
      pagesProcessed: job.pagesProcessed,
      downloadUrl: job.downloadUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }
}
