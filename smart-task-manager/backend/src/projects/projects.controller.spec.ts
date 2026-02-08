import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { User } from '../users/entities/user.entity';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { Role, ProjectRole } from '../common/enums';

describe('ProjectsController', () => {
  let controller: ProjectsController;
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

  const mockProject: Project = {
    id: 'project-uuid',
    name: 'Test Project',
    description: 'A test project',
    ownerId: 'user-uuid',
    owner: mockUser,
    members: [],
    tasks: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMember: ProjectMember = {
    id: 'member-uuid',
    projectId: 'project-uuid',
    userId: 'new-user-uuid',
    role: ProjectRole.MEMBER,
    project: null as any,
    user: null as any,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            addMember: jest.fn(),
            removeMember: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project', async () => {
      projectsService.create.mockResolvedValue(mockProject);

      const dto = { name: 'Test Project', description: 'A test project' };
      const result = await controller.create(dto, mockUser);

      expect(projectsService.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockProject);
    });
  });

  describe('findAll', () => {
    it('should return all accessible projects', async () => {
      projectsService.findAll.mockResolvedValue([mockProject]);

      const result = await controller.findAll(mockUser);

      expect(projectsService.findAll).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([mockProject]);
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      projectsService.findOne.mockResolvedValue(mockProject);

      const result = await controller.findOne('project-uuid', mockUser);

      expect(projectsService.findOne).toHaveBeenCalledWith('project-uuid', mockUser);
      expect(result).toEqual(mockProject);
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const updatedProject = { ...mockProject, name: 'Updated' };
      projectsService.update.mockResolvedValue(updatedProject);

      const dto = { name: 'Updated' };
      const result = await controller.update('project-uuid', dto, mockUser);

      expect(projectsService.update).toHaveBeenCalledWith('project-uuid', dto, mockUser);
      expect(result).toEqual(updatedProject);
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      projectsService.remove.mockResolvedValue(undefined);

      await controller.remove('project-uuid', mockUser);

      expect(projectsService.remove).toHaveBeenCalledWith('project-uuid', mockUser);
    });
  });

  describe('addMember', () => {
    it('should add a member to a project', async () => {
      projectsService.addMember.mockResolvedValue(mockMember);

      const dto = { userId: 'new-user-uuid' };
      const result = await controller.addMember('project-uuid', dto, mockUser);

      expect(projectsService.addMember).toHaveBeenCalledWith('project-uuid', dto, mockUser);
      expect(result).toEqual(mockMember);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from a project', async () => {
      projectsService.removeMember.mockResolvedValue(undefined);

      await controller.removeMember('project-uuid', 'some-user-uuid', mockUser);

      expect(projectsService.removeMember).toHaveBeenCalledWith(
        'project-uuid',
        'some-user-uuid',
        mockUser,
      );
    });
  });
});
