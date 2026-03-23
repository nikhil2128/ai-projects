import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { User } from '../users/entities/user.entity';
import { Task } from './entities/task.entity';
import { Role, TaskStatus, TaskPriority } from '../common/enums';

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            create: jest.fn(),
            findMyTasks: jest.fn(),
            findAllByProject: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            assign: jest.fn(),
            unassign: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task', async () => {
      tasksService.create.mockResolvedValue(mockTask);

      const dto = { title: 'Test Task', projectId: 'project-uuid' };
      const result = await controller.create(dto, mockUser);

      expect(tasksService.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockTask);
    });
  });

  describe('findMyTasks', () => {
    it('should return tasks assigned to current user', async () => {
      tasksService.findMyTasks.mockResolvedValue([mockTask]);

      const result = await controller.findMyTasks(mockUser);

      expect(tasksService.findMyTasks).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([mockTask]);
    });
  });

  describe('findByProject', () => {
    it('should return tasks for a project', async () => {
      tasksService.findAllByProject.mockResolvedValue([mockTask]);

      const result = await controller.findByProject('project-uuid', mockUser);

      expect(tasksService.findAllByProject).toHaveBeenCalledWith('project-uuid', mockUser);
      expect(result).toEqual([mockTask]);
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      tasksService.findOne.mockResolvedValue(mockTask);

      const result = await controller.findOne('task-uuid', mockUser);

      expect(tasksService.findOne).toHaveBeenCalledWith('task-uuid', mockUser);
      expect(result).toEqual(mockTask);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      tasksService.update.mockResolvedValue(updatedTask);

      const dto = { title: 'Updated Task' };
      const result = await controller.update('task-uuid', dto, mockUser);

      expect(tasksService.update).toHaveBeenCalledWith('task-uuid', dto, mockUser);
      expect(result).toEqual(updatedTask);
    });
  });

  describe('assign', () => {
    it('should assign a task to a user', async () => {
      const assignedTask = { ...mockTask, assigneeId: 'assignee-uuid' };
      tasksService.assign.mockResolvedValue(assignedTask);

      const result = await controller.assign('task-uuid', 'assignee-uuid', mockUser);

      expect(tasksService.assign).toHaveBeenCalledWith('task-uuid', 'assignee-uuid', mockUser);
      expect(result).toEqual(assignedTask);
    });
  });

  describe('unassign', () => {
    it('should unassign a task', async () => {
      tasksService.unassign.mockResolvedValue(mockTask);

      const result = await controller.unassign('task-uuid', mockUser);

      expect(tasksService.unassign).toHaveBeenCalledWith('task-uuid', mockUser);
      expect(result).toEqual(mockTask);
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      tasksService.remove.mockResolvedValue(undefined);

      await controller.remove('task-uuid', mockUser);

      expect(tasksService.remove).toHaveBeenCalledWith('task-uuid', mockUser);
    });
  });
});
