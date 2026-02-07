import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectRole } from '../../common/enums';

export class AddMemberDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: ProjectRole, default: ProjectRole.MEMBER })
  @IsOptional()
  @IsEnum(ProjectRole)
  role?: ProjectRole;
}
