import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { User } from '../users/entities/user.entity';
import { Role, ProjectRole } from '../common/enums';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectsRepository: jest.Mocked<Repository<Project>>;
  let membersRepository: jest.Mocked<Repository<ProjectMember>>;

  const mockOwner: User = {
    id: 'owner-uuid',
    email: 'owner@example.com',
    password: 'hashed',
    firstName: 'Owner',
    lastName: 'User',
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

  const mockMemberUser: User = {
    id: 'member-uuid',
    email: 'member@example.com',
    password: 'hashed',
    firstName: 'Member',
    lastName: 'User',
    role: Role.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMembership: ProjectMember = {
    id: 'member-record-uuid',
    projectId: 'project-uuid',
    userId: 'owner-uuid',
    role: ProjectRole.OWNER,
    project: null as any,
    user: mockOwner,
    createdAt: new Date(),
  };

  const mockProject: Project = {
    id: 'project-uuid',
    name: 'Test Project',
    description: 'A test project',
    ownerId: 'owner-uuid',
    owner: mockOwner,
    members: [mockMembership],
    tasks: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    projectsRepository = module.get(getRepositoryToken(Project));
    membersRepository = module.get(getRepositoryToken(ProjectMember));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project and add owner as member', async () => {
      const savedProject = { ...mockProject, id: 'new-project-uuid' };
      projectsRepository.create.mockReturnValue(savedProject);
      projectsRepository.save.mockResolvedValue(savedProject);
      membersRepository.create.mockReturnValue(mockMembership);
      membersRepository.save.mockResolvedValue(mockMembership);
      // Mock the findOne call that happens after create
      projectsRepository.findOne.mockResolvedValue(savedProject);
      membersRepository.findOne.mockResolvedValue(mockMembership);

      const result = await service.create(
        { name: 'Test Project', description: 'A test project' },
        mockOwner,
      );

      expect(projectsRepository.create).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'A test project',
        ownerId: 'owner-uuid',
      });
      expect(projectsRepository.save).toHaveBeenCalled();
      expect(membersRepository.create).toHaveBeenCalledWith({
        projectId: 'new-project-uuid',
        userId: 'owner-uuid',
        role: ProjectRole.OWNER,
      });
      expect(membersRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all projects for admin users', async () => {
      projectsRepository.find.mockResolvedValue([mockProject]);

      const result = await service.findAll(mockAdmin);

      expect(projectsRepository.find).toHaveBeenCalledWith({
        relations: ['members', 'members.user', 'owner'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockProject]);
    });

    it('should return accessible projects for non-admin users', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockProject]),
      };
      projectsRepository.createQueryBuilder.mockReturnValue(qb as any);

      const result = await service.findAll(mockOwner);

      expect(projectsRepository.createQueryBuilder).toHaveBeenCalledWith('project');
      expect(qb.where).toHaveBeenCalled();
      expect(result).toEqual([mockProject]);
    });
  });

  describe('findOne', () => {
    it('should return a project if found and user is admin', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.findOne('project-uuid', mockAdmin);

      expect(result).toEqual(mockProject);
    });

    it('should return a project if found and user has access', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue(mockMembership);

      const result = await service.findOne('project-uuid', mockOwner);

      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException when project not found', async () => {
      projectsRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('unknown-uuid', mockOwner)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('project-uuid', mockMemberUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update a project when user is owner', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue(mockMembership);
      projectsRepository.save.mockResolvedValue({ ...mockProject, name: 'Updated' });

      const result = await service.update('project-uuid', { name: 'Updated' }, mockOwner);

      expect(projectsRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update a project when user is admin', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      projectsRepository.save.mockResolvedValue({ ...mockProject, name: 'Updated' });

      const result = await service.update('project-uuid', { name: 'Updated' }, mockAdmin);

      expect(projectsRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when non-owner tries to update', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue({
        ...mockMembership,
        userId: 'member-uuid',
        role: ProjectRole.MEMBER,
      });

      await expect(
        service.update('project-uuid', { name: 'Updated' }, mockMemberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove a project when user is owner', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue(mockMembership);
      projectsRepository.remove.mockResolvedValue(mockProject);

      await service.remove('project-uuid', mockOwner);

      expect(projectsRepository.remove).toHaveBeenCalledWith(mockProject);
    });

    it('should remove a project when user is admin', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      projectsRepository.remove.mockResolvedValue(mockProject);

      await service.remove('project-uuid', mockAdmin);

      expect(projectsRepository.remove).toHaveBeenCalledWith(mockProject);
    });

    it('should throw ForbiddenException when non-owner tries to remove', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue({
        ...mockMembership,
        userId: 'member-uuid',
        role: ProjectRole.MEMBER,
      });

      await expect(service.remove('project-uuid', mockMemberUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('addMember', () => {
    it('should add a new member to the project', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne
        .mockResolvedValueOnce(mockMembership) // assertUserHasAccess for owner
        .mockResolvedValueOnce(null); // no existing member
      const newMember = {
        ...mockMembership,
        userId: 'new-member-uuid',
        role: ProjectRole.MEMBER,
      };
      membersRepository.create.mockReturnValue(newMember);
      membersRepository.save.mockResolvedValue(newMember);

      const result = await service.addMember(
        'project-uuid',
        { userId: 'new-member-uuid' },
        mockOwner,
      );

      expect(membersRepository.create).toHaveBeenCalledWith({
        projectId: 'project-uuid',
        userId: 'new-member-uuid',
        role: ProjectRole.MEMBER,
      });
      expect(result).toEqual(newMember);
    });

    it('should update role of existing member', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      const existingMember = {
        ...mockMembership,
        userId: 'new-member-uuid',
        role: ProjectRole.MEMBER,
      };
      membersRepository.findOne
        .mockResolvedValueOnce(mockMembership) // assertUserHasAccess
        .mockResolvedValueOnce(existingMember); // existing member
      membersRepository.save.mockResolvedValue({
        ...existingMember,
        role: ProjectRole.OWNER,
      });

      const result = await service.addMember(
        'project-uuid',
        { userId: 'new-member-uuid', role: ProjectRole.OWNER },
        mockOwner,
      );

      expect(membersRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when non-owner tries to add member', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue({
        ...mockMembership,
        userId: 'member-uuid',
        role: ProjectRole.MEMBER,
      });

      await expect(
        service.addMember('project-uuid', { userId: 'new-user-uuid' }, mockMemberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeMember', () => {
    it('should remove a member from the project', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      const memberToRemove = {
        ...mockMembership,
        userId: 'member-uuid',
        role: ProjectRole.MEMBER,
      };
      membersRepository.findOne
        .mockResolvedValueOnce(mockMembership) // assertUserHasAccess
        .mockResolvedValueOnce(memberToRemove); // find member to remove
      membersRepository.remove.mockResolvedValue(memberToRemove);

      await service.removeMember('project-uuid', 'member-uuid', mockOwner);

      expect(membersRepository.remove).toHaveBeenCalledWith(memberToRemove);
    });

    it('should throw ForbiddenException when trying to remove owner', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue(mockMembership); // assertUserHasAccess

      await expect(service.removeMember('project-uuid', 'owner-uuid', mockOwner)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when member not found', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne
        .mockResolvedValueOnce(mockMembership) // assertUserHasAccess
        .mockResolvedValueOnce(null); // member not found

      await expect(
        service.removeMember('project-uuid', 'nonexistent-uuid', mockOwner),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-owner tries to remove member', async () => {
      projectsRepository.findOne.mockResolvedValue(mockProject);
      membersRepository.findOne.mockResolvedValue({
        ...mockMembership,
        userId: 'member-uuid',
        role: ProjectRole.MEMBER,
      });

      await expect(
        service.removeMember('project-uuid', 'another-uuid', mockMemberUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertUserHasAccess', () => {
    it('should not throw when user has access', async () => {
      membersRepository.findOne.mockResolvedValue(mockMembership);

      await expect(
        service.assertUserHasAccess('project-uuid', 'owner-uuid'),
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user has no access', async () => {
      membersRepository.findOne.mockResolvedValue(null);

      await expect(service.assertUserHasAccess('project-uuid', 'unknown-uuid')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
