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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(dto, user);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all tasks assigned to the current user' })
  findMyTasks(@CurrentUser() user: User) {
    return this.tasksService.findMyTasks(user);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get all tasks for a project' })
  @ApiParam({ name: 'projectId', type: 'string' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.findAllByProject(projectId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.tasksService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task (title, description, status, priority, due date, assignee)' })
  @ApiParam({ name: 'id', type: 'string' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Patch(':id/assign/:assigneeId')
  @ApiOperation({ summary: 'Assign a task to a user' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'assigneeId', type: 'string' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assigneeId', ParseUUIDPipe) assigneeId: string,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.assign(id, assigneeId, user);
  }

  @Patch(':id/unassign')
  @ApiOperation({ summary: 'Unassign a task' })
  @ApiParam({ name: 'id', type: 'string' })
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.unassign(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiParam({ name: 'id', type: 'string' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.tasksService.remove(id, user);
  }
}
