import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { ProjectsService } from '../projects/projects.service';
import { User } from '../users/entities/user.entity';
import { Role, TaskStatus, TaskPriority } from '../common/enums';

describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: jest.Mocked<Repository<Task>>;
  let projectsService: jest.Mocked<ProjectsService>;

  const mockUser: User = {
    id: 'user-uuid',
    email: 'john@example.com',
    password: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    role: Role.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin: User = {
    id: 'admin-uuid',
    email: 'admin@example.com',
    password: 'hashed',
    firstName: 'Admin',
    lastName: 'User',
    role: Role.ADMIN,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask: Task = {
    id: 'task-uuid',
    title: 'Test Task',
    description: 'A test task',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    dueDate: null as any,
    projectId: 'project-uuid',
    project: null as any,
    creatorId: 'user-uuid',
    creator: mockUser,
    assigneeId: null as any,
    assignee: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject = {
    id: 'project-uuid',
    name: 'Test Project',
    ownerId: 'user-uuid',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ProjectsService,
          useValue: {
            assertUserHasAccess: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    tasksRepository = module.get(getRepositoryToken(Task));
    projectsService = module.get(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task for a non-admin user with access', async () => {
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.create.mockReturnValue(mockTask);
      tasksRepository.save.mockResolvedValue(mockTask);
      tasksRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.create(
        { title: 'Test Task', projectId: 'project-uuid' },
        mockUser,
      );

      expect(projectsService.assertUserHasAccess).toHaveBeenCalledWith('project-uuid', 'user-uuid');
      expect(tasksRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create a task for an admin without access check', async () => {
      tasksRepository.create.mockReturnValue(mockTask);
      tasksRepository.save.mockResolvedValue(mockTask);
      tasksRepository.findOne.mockResolvedValue(mockTask);

      await service.create({ title: 'Test Task', projectId: 'project-uuid' }, mockAdmin);

      // Admin should not have assertUserHasAccess called for their own access
      // but it will still be called because admin check is specific to creator, not assignee
      expect(projectsService.assertUserHasAccess).not.toHaveBeenCalledWith(
        'project-uuid',
        'admin-uuid',
      );
    });

    it('should verify assignee access when assigneeId is provided', async () => {
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.create.mockReturnValue(mockTask);
      tasksRepository.save.mockResolvedValue(mockTask);
      tasksRepository.findOne.mockResolvedValue(mockTask);

      await service.create(
        { title: 'Test Task', projectId: 'project-uuid', assigneeId: 'assignee-uuid' },
        mockUser,
      );

      expect(projectsService.assertUserHasAccess).toHaveBeenCalledWith(
        'project-uuid',
        'assignee-uuid',
      );
    });

    it('should handle dueDate conversion', async () => {
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.create.mockReturnValue(mockTask);
      tasksRepository.save.mockResolvedValue(mockTask);
      tasksRepository.findOne.mockResolvedValue(mockTask);

      await service.create(
        {
          title: 'Test Task',
          projectId: 'project-uuid',
          dueDate: '2026-03-15T00:00:00.000Z',
        },
        mockUser,
      );

      expect(tasksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dueDate: expect.any(Date),
        }),
      );
    });
  });

  describe('findAllByProject', () => {
    it('should return tasks for a project (non-admin)', async () => {
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.find.mockResolvedValue([mockTask]);

      const result = await service.findAllByProject('project-uuid', mockUser);

      expect(projectsService.assertUserHasAccess).toHaveBeenCalledWith('project-uuid', 'user-uuid');
      expect(tasksRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-uuid' },
        relations: ['creator', 'assignee', 'project'],
        order: { priority: 'ASC', createdAt: 'DESC' },
      });
      expect(result).toEqual([mockTask]);
    });

    it('should return tasks for a project (admin, no access check)', async () => {
      tasksRepository.find.mockResolvedValue([mockTask]);

      await service.findAllByProject('project-uuid', mockAdmin);

      expect(projectsService.assertUserHasAccess).not.toHaveBeenCalled();
    });
  });

  describe('findMyTasks', () => {
    it('should return tasks assigned to the current user', async () => {
      tasksRepository.find.mockResolvedValue([mockTask]);

      const result = await service.findMyTasks(mockUser);

      expect(tasksRepository.find).toHaveBeenCalledWith({
        where: { assigneeId: 'user-uuid' },
        relations: ['creator', 'assignee', 'project'],
        order: { priority: 'ASC', dueDate: 'ASC' },
      });
      expect(result).toEqual([mockTask]);
    });
  });

  describe('findOne', () => {
    it('should return a task when found and user has access', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);

      const result = await service.findOne('task-uuid', mockUser);

      expect(result).toEqual(mockTask);
    });

    it('should return a task for admin without access check', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findOne('task-uuid', mockAdmin);

      expect(projectsService.assertUserHasAccess).not.toHaveBeenCalled();
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException when task not found', async () => {
      tasksRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('unknown-uuid', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no project access', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockRejectedValue(
        new ForbiddenException('You do not have access to this project'),
      );

      await expect(service.findOne('task-uuid', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.save.mockResolvedValue({ ...mockTask, title: 'Updated' });

      const result = await service.update('task-uuid', { title: 'Updated' }, mockUser);

      expect(tasksRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should verify new assignee access when reassigning', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.save.mockResolvedValue(mockTask);

      await service.update('task-uuid', { assigneeId: 'new-assignee-uuid' }, mockUser);

      expect(projectsService.assertUserHasAccess).toHaveBeenCalledWith(
        'project-uuid',
        'new-assignee-uuid',
      );
    });

    it('should handle dueDate update', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.save.mockResolvedValue(mockTask);

      await service.update('task-uuid', { dueDate: '2026-04-01T00:00:00.000Z' }, mockUser);

      expect(tasksRepository.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a task when user is the creator', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.remove.mockResolvedValue(mockTask);

      await service.remove('task-uuid', mockUser);

      expect(tasksRepository.remove).toHaveBeenCalledWith(mockTask);
    });

    it('should remove a task when user is admin', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      tasksRepository.remove.mockResolvedValue(mockTask);

      await service.remove('task-uuid', mockAdmin);

      expect(tasksRepository.remove).toHaveBeenCalledWith(mockTask);
    });

    it('should remove a task when user is project owner', async () => {
      const otherUser: User = {
        ...mockUser,
        id: 'other-uuid',
        email: 'other@example.com',
      };
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      projectsService.findOne.mockResolvedValue(mockProject as any);
      tasksRepository.remove.mockResolvedValue(mockTask);

      // User is the project owner (mockProject.ownerId = 'user-uuid')
      // but not the task creator (mockTask.creatorId = 'user-uuid')
      // So we need a scenario where the user is project owner but not creator
      const taskByOther = { ...mockTask, creatorId: 'another-uuid' };
      tasksRepository.findOne.mockResolvedValue(taskByOther);

      await service.remove('task-uuid', { ...mockUser, id: 'user-uuid' });

      expect(projectsService.findOne).toHaveBeenCalledWith('project-uuid', mockUser);
    });

    it('should throw ForbiddenException when user is not creator or project owner', async () => {
      const nonOwnerProject = { ...mockProject, ownerId: 'someone-else' };
      const taskByOther = { ...mockTask, creatorId: 'another-uuid' };
      tasksRepository.findOne.mockResolvedValue(taskByOther);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      projectsService.findOne.mockResolvedValue(nonOwnerProject as any);

      await expect(service.remove('task-uuid', mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assign', () => {
    it('should assign a task to a user', async () => {
      tasksRepository.findOne.mockResolvedValue(mockTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.save.mockResolvedValue({ ...mockTask, assigneeId: 'assignee-uuid' });

      const result = await service.assign('task-uuid', 'assignee-uuid', mockUser);

      expect(projectsService.assertUserHasAccess).toHaveBeenCalledWith(
        'project-uuid',
        'assignee-uuid',
      );
      expect(tasksRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('unassign', () => {
    it('should unassign a task', async () => {
      const assignedTask = { ...mockTask, assigneeId: 'assignee-uuid' };
      tasksRepository.findOne.mockResolvedValue(assignedTask);
      projectsService.assertUserHasAccess.mockResolvedValue(undefined);
      tasksRepository.save.mockResolvedValue({ ...mockTask, assigneeId: null as any });

      const result = await service.unassign('task-uuid', mockUser);

      expect(tasksRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
