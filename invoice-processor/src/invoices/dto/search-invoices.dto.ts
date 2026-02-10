import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchInvoicesDto {
  @ApiPropertyOptional({ description: 'Filter by vendor name (partial match, case-insensitive)' })
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional({ description: 'Filter by exact amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ description: 'Filter by minimum amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMin?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum amount' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMax?: number;

  @ApiPropertyOptional({ description: 'Filter by due date (exact, YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Filter by due date from (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by due date to (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['createdAt', 'vendorName', 'amount', 'dueDate'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'vendorName' | 'amount' | 'dueDate' = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
