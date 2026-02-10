import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InvoicesService } from './invoices.service';
import {
  UploadInvoiceResponseDto,
  InvoiceStatusResponseDto,
  SearchInvoicesDto,
  SearchInvoicesResponseDto,
} from './dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ── Upload Invoice ────────────────────────────────────────────────

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
      },
    }),
  )
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  @ApiOperation({
    summary: 'Upload an invoice PDF for processing',
    description:
      'Accepts a PDF file, stores it, and enqueues it for async extraction. Returns an invoice ID for status polling.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF invoice file' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 202, description: 'Invoice accepted for processing', type: UploadInvoiceResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid file (not PDF or missing)' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async uploadInvoice(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadInvoiceResponseDto> {
    return this.invoicesService.uploadInvoice(file);
  }

  // ── Get Invoice Status ────────────────────────────────────────────

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get the processing status of an invoice',
    description:
      'Returns the current status (pending/processing/completed/failed) and extracted data if available.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice status', type: InvoiceStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<InvoiceStatusResponseDto> {
    return this.invoicesService.getInvoiceStatus(id);
  }

  // ── Search Invoices ───────────────────────────────────────────────

  @Get('search')
  @ApiOperation({
    summary: 'Search processed invoices',
    description:
      'Search completed invoices by vendor name, amount range, due date range. Supports pagination and sorting.',
  })
  @ApiResponse({ status: 200, description: 'Search results', type: SearchInvoicesResponseDto })
  async searchInvoices(
    @Query() query: SearchInvoicesDto,
  ): Promise<SearchInvoicesResponseDto> {
    return this.invoicesService.searchInvoices(query);
  }
}
