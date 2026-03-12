import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ExportsService } from './exports.service';
import { CreateExportDto, ExportStatusResponseDto } from './dto';

@ApiTags('Exports')
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Create a new data export job',
    description:
      'Accepts a paginated API URL, enqueues an async export job that fetches all pages, ' +
      'generates a CSV, uploads it to S3, and emails the download link.',
  })
  @ApiResponse({
    status: 202,
    description: 'Export job accepted for processing',
    type: ExportStatusResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request payload' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async createExport(@Body() dto: CreateExportDto): Promise<ExportStatusResponseDto> {
    return this.exportsService.createExport(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get export job status',
    description:
      'Returns the current status, progress, and download URL (once completed) for an export job.',
  })
  @ApiParam({ name: 'id', description: 'Export job UUID' })
  @ApiResponse({ status: 200, description: 'Export job status', type: ExportStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Export job not found' })
  async getExportStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExportStatusResponseDto> {
    return this.exportsService.getExportStatus(id);
  }
}
