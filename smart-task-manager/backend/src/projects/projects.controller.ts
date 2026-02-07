import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: User) {
    return this.projectsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects accessible to the current user' })
  findAll(@CurrentUser() user: User) {
    return this.projectsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.projectsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project (owner only)' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project (owner only)' })
  @ApiParam({ name: 'id', type: 'string' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.projectsService.remove(id, user);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to the project (owner only)' })
  @ApiParam({ name: 'id', type: 'string' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.addMember(id, dto, user);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from the project (owner only)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'userId', type: 'string' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.removeMember(id, userId, user);
  }
}
