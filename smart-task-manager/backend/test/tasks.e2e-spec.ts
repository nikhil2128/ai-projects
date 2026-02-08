import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerUser, authHeader, TestUser } from './test-utils';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let ownerAuth: TestUser;
  let memberAuth: TestUser;
  let adminAuth: TestUser;
  let outsiderAuth: TestUser;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    app = await createTestApp();

    ownerAuth = await registerUser(app, {
      email: 'task-owner@example.com',
      password: 'StrongP@ss1',
      firstName: 'TaskOwner',
      lastName: 'User',
    });

    memberAuth = await registerUser(app, {
      email: 'task-member@example.com',
      password: 'StrongP@ss1',
      firstName: 'TaskMember',
      lastName: 'User',
    });

    adminAuth = await registerUser(app, {
      email: 'task-admin@example.com',
      password: 'StrongP@ss1',
      firstName: 'TaskAdmin',
      lastName: 'User',
      role: 'admin',
    });

    outsiderAuth = await registerUser(app, {
      email: 'task-outsider@example.com',
      password: 'StrongP@ss1',
      firstName: 'Outsider',
      lastName: 'User',
    });

    // Create a project
    const projRes = await request(app.getHttpServer())
      .post('/projects')
      .set(...authHeader(ownerAuth.accessToken))
      .send({ name: 'Task Test Project' })
      .expect(201);
    projectId = projRes.body.id;

    // Add member to the project
    await request(app.getHttpServer())
      .post(`/projects/${projectId}/members`)
      .set(...authHeader(ownerAuth.accessToken))
      .send({ userId: memberAuth.user.id })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /tasks', () => {
    it('should create a task', async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(ownerAuth.accessToken))
        .send({
          title: 'Test Task',
          description: 'A test task',
          projectId,
          priority: 'high',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Test Task');
      expect(res.body.projectId).toBe(projectId);
      expect(res.body.creatorId).toBe(ownerAuth.user.id);

      taskId = res.body.id;
    });

    it('should create a task with assignee', async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(ownerAuth.accessToken))
        .send({
          title: 'Assigned Task',
          projectId,
          assigneeId: memberAuth.user.id,
        })
        .expect(201);

      expect(res.body.assigneeId).toBe(memberAuth.user.id);
    });

    it('should create a task with dueDate', async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(ownerAuth.accessToken))
        .send({
          title: 'Task with deadline',
          projectId,
          dueDate: '2026-12-31T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.dueDate).toBeDefined();
    });

    it('should allow a project member to create a task', async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(memberAuth.accessToken))
        .send({ title: 'Member Task', projectId })
        .expect(201);

      expect(res.body.creatorId).toBe(memberAuth.user.id);
    });

    it('should fail for non-member', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(outsiderAuth.accessToken))
        .send({ title: 'Should Fail', projectId })
        .expect(403);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'Should Fail', projectId })
        .expect(401);
    });

    it('should fail with missing title', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(ownerAuth.accessToken))
        .send({ projectId })
        .expect(400);
    });

    it('should fail with missing projectId', async () => {
      await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(ownerAuth.accessToken))
        .send({ title: 'No project' })
        .expect(400);
    });
  });

  describe('GET /tasks/my', () => {
    it('should return tasks assigned to the current user', async () => {
      const res = await request(app.getHttpServer())
        .get('/tasks/my')
        .set(...authHeader(memberAuth.accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // The member has at least one assigned task from the "Assigned Task" created above
      const assignedToMember = res.body.filter((t: any) => t.assigneeId === memberAuth.user.id);
      expect(assignedToMember.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty for user with no assigned tasks', async () => {
      const res = await request(app.getHttpServer())
        .get('/tasks/my')
        .set(...authHeader(outsiderAuth.accessToken))
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GET /tasks/project/:projectId', () => {
    it('should return tasks for a project', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tasks/project/${projectId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should fail for non-member', async () => {
      await request(app.getHttpServer())
        .get(`/tasks/project/${projectId}`)
        .set(...authHeader(outsiderAuth.accessToken))
        .expect(403);
    });

    it('should work for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tasks/project/${projectId}`)
        .set(...authHeader(adminAuth.accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return a task by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      expect(res.body.id).toBe(taskId);
      expect(res.body.title).toBe('Test Task');
    });

    it('should fail for non-member', async () => {
      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set(...authHeader(outsiderAuth.accessToken))
        .expect(403);
    });

    it('should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .get('/tasks/00000000-0000-0000-0000-000000000000')
        .set(...authHeader(ownerAuth.accessToken))
        .expect(404);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update a task', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .send({ title: 'Updated Task', status: 'in_progress' })
        .expect(200);

      expect(res.body.title).toBe('Updated Task');
      expect(res.body.status).toBe('in_progress');
    });

    it('should update task dueDate', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .send({ dueDate: '2026-06-15T00:00:00.000Z' })
        .expect(200);

      expect(res.body.dueDate).toBeDefined();
    });

    it('should update task priority', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .send({ priority: 'urgent' })
        .expect(200);

      expect(res.body.priority).toBe('urgent');
    });
  });

  describe('PATCH /tasks/:id/assign/:assigneeId', () => {
    it('should assign a task to a project member', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/assign/${memberAuth.user.id}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      expect(res.body.assigneeId).toBe(memberAuth.user.id);
    });

    it('should fail to assign to non-member', async () => {
      await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/assign/${outsiderAuth.user.id}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(403);
    });
  });

  describe('PATCH /tasks/:id/unassign', () => {
    it('should unassign a task', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}/unassign`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      expect(res.body.assigneeId).toBeNull();
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should fail for non-creator non-owner', async () => {
      // Create a task by owner, try to delete by member
      const taskRes = await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(ownerAuth.accessToken))
        .send({ title: 'Owner Task to Delete', projectId })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/tasks/${taskRes.body.id}`)
        .set(...authHeader(memberAuth.accessToken))
        .expect(403);

      // Clean up - delete with owner
      await request(app.getHttpServer())
        .delete(`/tasks/${taskRes.body.id}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);
    });

    it('should allow creator to delete their task', async () => {
      // Create a task by member
      const taskRes = await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(memberAuth.accessToken))
        .send({ title: 'Member Task to Delete', projectId })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/tasks/${taskRes.body.id}`)
        .set(...authHeader(memberAuth.accessToken))
        .expect(200);
    });

    it('should allow admin to delete any task', async () => {
      const taskRes = await request(app.getHttpServer())
        .post('/tasks')
        .set(...authHeader(ownerAuth.accessToken))
        .send({ title: 'Admin Delete Task', projectId })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/tasks/${taskRes.body.id}`)
        .set(...authHeader(adminAuth.accessToken))
        .expect(200);
    });

    it('should delete the main test task', async () => {
      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(404);
    });
  });
});
