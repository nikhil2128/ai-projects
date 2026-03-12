import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsUrl,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { PaginationStrategy } from '../enums';

export class CreateExportDto {
  @ApiProperty({
    description: 'The paginated API URL to fetch data from',
    example: 'https://api.example.com/v1/orders',
  })
  @IsUrl({ require_tld: false })
  apiUrl!: string;

  @ApiProperty({
    description: 'Email address to send the download link to',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Pagination strategy used by the API',
    enum: PaginationStrategy,
    default: PaginationStrategy.PAGE,
  })
  @IsOptional()
  @IsEnum(PaginationStrategy)
  paginationStrategy?: PaginationStrategy;

  @ApiPropertyOptional({
    description: 'HTTP headers to forward to the API (e.g. Authorization)',
    example: { Authorization: 'Bearer token123' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Additional query parameters to append to the API URL',
    example: { status: 'active', sort: 'created_at' },
  })
  @IsOptional()
  @IsObject()
  queryParams?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    default: 500,
    minimum: 1,
    maximum: 5000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'JSON path to the data array in the API response (dot notation)',
    default: 'data',
    example: 'data.items',
  })
  @IsOptional()
  @IsString()
  dataPath?: string;

  @ApiPropertyOptional({
    description: 'For cursor pagination: JSON path to the next cursor value in the response',
    example: 'meta.nextCursor',
  })
  @IsOptional()
  @IsString()
  cursorPath?: string;

  @ApiPropertyOptional({
    description: 'For cursor pagination: query parameter name for the cursor value',
    example: 'cursor',
  })
  @IsOptional()
  @IsString()
  cursorParam?: string;

  @ApiPropertyOptional({
    description: 'Custom file name for the exported CSV (without extension)',
    example: 'orders-export-2026',
  })
  @IsOptional()
  @IsString()
  fileName?: string;
}
