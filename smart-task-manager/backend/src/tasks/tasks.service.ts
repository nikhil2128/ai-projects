import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasksRepository: Repository<Task>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(dto: CreateTaskDto, user: User): Promise<Task> {
    // Verify user has access to the project
    if (user.role !== Role.ADMIN) {
      await this.projectsService.assertUserHasAccess(dto.projectId, user.id);
    }

    // If assigning to someone, verify assignee has access to the project
    if (dto.assigneeId) {
      await this.projectsService.assertUserHasAccess(
        dto.projectId,
        dto.assigneeId,
      );
    }

    const task = this.tasksRepository.create({
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      creatorId: user.id,
    });

    const savedTask = await this.tasksRepository.save(task);
    return this.findOne(savedTask.id, user);
  }

  async findAllByProject(projectId: string, user: User): Promise<Task[]> {
    // Verify user has access to the project
    if (user.role !== Role.ADMIN) {
      await this.projectsService.assertUserHasAccess(projectId, user.id);
    }

    return this.tasksRepository.find({
      where: { projectId },
      relations: ['creator', 'assignee', 'project'],
      order: {
        priority: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async findMyTasks(user: User): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { assigneeId: user.id },
      relations: ['creator', 'assignee', 'project'],
      order: {
        priority: 'ASC',
        dueDate: 'ASC',
      },
    });
  }

  async findOne(id: string, user: User): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['creator', 'assignee', 'project'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    // Verify user has access to the task's project
    if (user.role !== Role.ADMIN) {
      await this.projectsService.assertUserHasAccess(
        task.projectId,
        user.id,
      );
    }

    return task;
  }

  async update(id: string, dto: UpdateTaskDto, user: User): Promise<Task> {
    const task = await this.findOne(id, user);

    // If reassigning, verify new assignee has access to the project
    if (dto.assigneeId && dto.assigneeId !== task.assigneeId) {
      await this.projectsService.assertUserHasAccess(
        task.projectId,
        dto.assigneeId,
      );
    }

    if (dto.dueDate) {
      task.dueDate = new Date(dto.dueDate);
      delete (dto as any).dueDate;
    }

    Object.assign(task, dto);
    await this.tasksRepository.save(task);
    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const task = await this.findOne(id, user);

    // Only creator, project owner, or admin can delete
    if (
      task.creatorId !== user.id &&
      user.role !== Role.ADMIN
    ) {
      // Check if user is project owner
      const project = await this.projectsService.findOne(
        task.projectId,
        user,
      );
      if (project.ownerId !== user.id) {
        throw new ForbiddenException(
          'Only the task creator or project owner can delete this task',
        );
      }
    }

    await this.tasksRepository.remove(task);
  }

  async assign(
    id: string,
    assigneeId: string,
    user: User,
  ): Promise<Task> {
    const task = await this.findOne(id, user);

    // Verify assignee has access to the project
    await this.projectsService.assertUserHasAccess(
      task.projectId,
      assigneeId,
    );

    task.assigneeId = assigneeId;
    await this.tasksRepository.save(task);
    return this.findOne(id, user);
  }

  async unassign(id: string, user: User): Promise<Task> {
    const task = await this.findOne(id, user);
    task.assigneeId = null as any;
    task.assignee = null as any;
    await this.tasksRepository.save(task);
    return this.findOne(id, user);
  }
}
