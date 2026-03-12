import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportStatus } from '../enums';

export class ExportStatusResponseDto {
  @ApiProperty({ description: 'Export job UUID' })
  id!: string;

  @ApiProperty({ enum: ExportStatus, description: 'Current job status' })
  status!: ExportStatus;

  @ApiProperty({ description: 'Total records exported so far' })
  totalRecords!: number;

  @ApiProperty({ description: 'Pages fetched so far' })
  pagesProcessed!: number;

  @ApiPropertyOptional({ description: 'Download URL (available once completed)' })
  downloadUrl?: string | null;

  @ApiPropertyOptional({ description: 'Error message if the job failed' })
  errorMessage?: string | null;

  @ApiProperty({ description: 'When the job was created' })
  createdAt!: Date;

  @ApiPropertyOptional({ description: 'When processing started' })
  startedAt?: Date | null;

  @ApiPropertyOptional({ description: 'When processing completed' })
  completedAt?: Date | null;
}
