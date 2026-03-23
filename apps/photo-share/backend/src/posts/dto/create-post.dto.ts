import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ required: false, example: 'Beautiful sunset!' })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiProperty({ required: false, example: 'grayscale', default: 'none' })
  @IsOptional()
  @IsString()
  filter?: string;
}
