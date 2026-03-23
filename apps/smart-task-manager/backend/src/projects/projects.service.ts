import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ProjectMember } from './entities/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ProjectRole, Role } from '../common/enums';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepository: Repository<ProjectMember>,
  ) {}

  async create(dto: CreateProjectDto, user: User): Promise<Project> {
    const project = this.projectsRepository.create({
      ...dto,
      ownerId: user.id,
    });
    const savedProject = await this.projectsRepository.save(project);

    // Add owner as a member with OWNER role
    const member = this.membersRepository.create({
      projectId: savedProject.id,
      userId: user.id,
      role: ProjectRole.OWNER,
    });
    await this.membersRepository.save(member);

    return this.findOne(savedProject.id, user);
  }

  async findAll(user: User): Promise<Project[]> {
    if (user.role === Role.ADMIN) {
      return this.projectsRepository.find({
        relations: ['members', 'members.user', 'owner'],
        order: { createdAt: 'DESC' },
      });
    }

    // Return projects where user is owner or member
    return this.projectsRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.members', 'members')
      .leftJoinAndSelect('members.user', 'memberUser')
      .where(
        'project.ownerId = :userId OR project.id IN ' +
          '(SELECT pm."projectId" FROM project_members pm WHERE pm."userId" = :userId)',
        { userId: user.id },
      )
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id },
      relations: ['members', 'members.user', 'owner'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found`);
    }

    if (user.role !== Role.ADMIN) {
      await this.assertUserHasAccess(project.id, user.id);
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: User): Promise<Project> {
    const project = await this.findOne(id, user);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the project owner can update it');
    }

    Object.assign(project, dto);
    await this.projectsRepository.save(project);
    return this.findOne(id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const project = await this.findOne(id, user);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the project owner can delete it');
    }

    await this.projectsRepository.remove(project);
  }

  async addMember(projectId: string, dto: AddMemberDto, user: User): Promise<ProjectMember> {
    const project = await this.findOne(projectId, user);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the project owner can add members');
    }

    const existingMember = await this.membersRepository.findOne({
      where: { projectId, userId: dto.userId },
    });

    if (existingMember) {
      existingMember.role = dto.role || existingMember.role;
      return this.membersRepository.save(existingMember);
    }

    const member = this.membersRepository.create({
      projectId,
      userId: dto.userId,
      role: dto.role || ProjectRole.MEMBER,
    });
    return this.membersRepository.save(member);
  }

  async removeMember(projectId: string, userId: string, user: User): Promise<void> {
    const project = await this.findOne(projectId, user);

    if (project.ownerId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only the project owner can remove members');
    }

    if (userId === project.ownerId) {
      throw new ForbiddenException('Cannot remove the project owner');
    }

    const member = await this.membersRepository.findOne({
      where: { projectId, userId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    await this.membersRepository.remove(member);
  }

  async assertUserHasAccess(projectId: string, userId: string): Promise<void> {
    const membership = await this.membersRepository.findOne({
      where: { projectId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }
}
