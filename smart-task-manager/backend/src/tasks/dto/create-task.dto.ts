import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../../common/enums';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement login feature' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Add JWT-based authentication' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 'uuid-of-project' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '2026-03-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'uuid-of-assignee' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
