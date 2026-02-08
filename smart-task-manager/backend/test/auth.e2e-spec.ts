import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp, registerUser, authHeader } from './test-utils';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'StrongP@ss1',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.firstName).toBe('Test');
      expect(res.body.user.lastName).toBe('User');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should register user with admin role', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'StrongP@ss1',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
        })
        .expect(201);

      expect(res.body.user.role).toBe('admin');
    });

    it('should fail with duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'StrongP@ss1',
          firstName: 'Test2',
          lastName: 'User2',
        })
        .expect(409);
    });

    it('should fail with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'StrongP@ss1',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should fail with short password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'new@example.com',
          password: 'short',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);
    });

    it('should fail with missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'new@example.com' })
        .expect(400);
    });

    it('should fail with extra unknown fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'extra@example.com',
          password: 'StrongP@ss1',
          firstName: 'Test',
          lastName: 'User',
          unknownField: 'value',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'StrongP@ss1',
        })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should fail with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'StrongP@ss1',
        })
        .expect(401);
    });

    it('should fail with missing fields', async () => {
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    });
  });

  describe('GET /auth/profile', () => {
    it('should return profile for authenticated user', async () => {
      const auth = await registerUser(app, {
        email: 'profile@example.com',
        password: 'StrongP@ss1',
        firstName: 'Profile',
        lastName: 'User',
      });

      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set(...authHeader(auth.accessToken))
        .expect(200);

      expect(res.body.email).toBe('profile@example.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
