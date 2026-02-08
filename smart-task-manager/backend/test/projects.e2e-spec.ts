import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerUser, authHeader, TestUser } from './test-utils';

describe('Projects (e2e)', () => {
  let app: INestApplication;
  let ownerAuth: TestUser;
  let memberAuth: TestUser;
  let adminAuth: TestUser;
  let projectId: string;

  beforeAll(async () => {
    app = await createTestApp();

    ownerAuth = await registerUser(app, {
      email: 'proj-owner@example.com',
      password: 'StrongP@ss1',
      firstName: 'Owner',
      lastName: 'User',
    });

    memberAuth = await registerUser(app, {
      email: 'proj-member@example.com',
      password: 'StrongP@ss1',
      firstName: 'Member',
      lastName: 'User',
    });

    adminAuth = await registerUser(app, {
      email: 'proj-admin@example.com',
      password: 'StrongP@ss1',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /projects', () => {
    it('should create a project', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .set(...authHeader(ownerAuth.accessToken))
        .send({ name: 'Test Project', description: 'A test project' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Test Project');
      expect(res.body.description).toBe('A test project');
      expect(res.body.ownerId).toBe(ownerAuth.user.id);
      expect(res.body.members).toBeDefined();
      expect(res.body.members.length).toBeGreaterThanOrEqual(1);

      projectId = res.body.id;
    });

    it('should create a project without description', async () => {
      const res = await request(app.getHttpServer())
        .post('/projects')
        .set(...authHeader(ownerAuth.accessToken))
        .send({ name: 'No Description Project' })
        .expect(201);

      expect(res.body.name).toBe('No Description Project');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).post('/projects').send({ name: 'Test' }).expect(401);
    });

    it('should fail with missing name', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .set(...authHeader(ownerAuth.accessToken))
        .send({ description: 'No name' })
        .expect(400);
    });
  });

  describe('GET /projects', () => {
    it('should return projects for owner', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects')
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return all projects for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/projects')
        .set(...authHeader(adminAuth.accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/projects').expect(401);
    });
  });

  describe('GET /projects/:id', () => {
    it('should return a project by id for owner', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      expect(res.body.id).toBe(projectId);
      expect(res.body.name).toBe('Test Project');
    });

    it('should return a project for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set(...authHeader(adminAuth.accessToken))
        .expect(200);

      expect(res.body.id).toBe(projectId);
    });

    it('should fail for non-member user', async () => {
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set(...authHeader(memberAuth.accessToken))
        .expect(403);
    });

    it('should return 404 for non-existent project', async () => {
      await request(app.getHttpServer())
        .get('/projects/00000000-0000-0000-0000-000000000000')
        .set(...authHeader(ownerAuth.accessToken))
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/projects/not-a-uuid')
        .set(...authHeader(ownerAuth.accessToken))
        .expect(400);
    });
  });

  describe('PATCH /projects/:id', () => {
    it('should update a project for owner', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .send({ name: 'Updated Project' })
        .expect(200);

      expect(res.body.name).toBe('Updated Project');
    });

    it('should update a project for admin', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .set(...authHeader(adminAuth.accessToken))
        .send({ description: 'Admin updated' })
        .expect(200);

      expect(res.body.description).toBe('Admin updated');
    });

    it('should fail for non-owner non-admin', async () => {
      // First add member so they have access
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/members`)
        .set(...authHeader(ownerAuth.accessToken))
        .send({ userId: memberAuth.user.id })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .set(...authHeader(memberAuth.accessToken))
        .send({ name: 'Should Fail' })
        .expect(403);
    });
  });

  describe('POST /projects/:id/members', () => {
    it('should have added member in previous test', async () => {
      const res = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      const memberIds = res.body.members.map((m: any) => m.userId);
      expect(memberIds).toContain(memberAuth.user.id);
    });

    it('should fail when non-owner tries to add member', async () => {
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/members`)
        .set(...authHeader(memberAuth.accessToken))
        .send({ userId: adminAuth.user.id })
        .expect(403);
    });
  });

  describe('DELETE /projects/:id/members/:userId', () => {
    it('should remove a member from the project', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/members/${memberAuth.user.id}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);
    });

    it('should fail when trying to remove owner', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/members/${ownerAuth.user.id}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(403);
    });

    it('should fail when member not found', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}/members/00000000-0000-0000-0000-000000000000`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(404);
    });
  });

  describe('DELETE /projects/:id', () => {
    it('should fail for non-owner non-admin', async () => {
      // Re-add member
      await request(app.getHttpServer())
        .post(`/projects/${projectId}/members`)
        .set(...authHeader(ownerAuth.accessToken))
        .send({ userId: memberAuth.user.id });

      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set(...authHeader(memberAuth.accessToken))
        .expect(403);
    });

    it('should delete a project for owner', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(200);

      // Verify it's deleted
      await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set(...authHeader(ownerAuth.accessToken))
        .expect(404);
    });
  });
});
