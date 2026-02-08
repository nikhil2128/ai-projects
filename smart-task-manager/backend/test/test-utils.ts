import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { UsersModule } from '../src/users/users.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { TasksModule } from '../src/tasks/tasks.module';
import { User } from '../src/users/entities/user.entity';
import { Project } from '../src/projects/entities/project.entity';
import { ProjectMember } from '../src/projects/entities/project-member.entity';
import { Task } from '../src/tasks/entities/task.entity';

/**
 * Creates a NestJS application backed by an in-memory SQLite database
 * via better-sqlite3. This avoids needing a running PostgreSQL instance.
 *
 * The entities use `simple-enum` column types, which store as varchar
 * and are compatible with all database drivers including SQLite.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [
          () => ({
            JWT_SECRET: 'test-jwt-secret-key-for-e2e-tests',
            JWT_EXPIRATION: '1h',
            NODE_ENV: 'test',
          }),
        ],
      }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: [User, Project, ProjectMember, Task],
        synchronize: true,
        dropSchema: true,
      }),
      AuthModule,
      UsersModule,
      ProjectsModule,
      TasksModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Mirror production config
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.init();
  return app;
}

export interface TestUser {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  accessToken: string;
}

export async function registerUser(
  app: INestApplication,
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  },
): Promise<TestUser> {
  const res = await request(app.getHttpServer()).post('/auth/register').send(userData).expect(201);
  return res.body;
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<TestUser> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body;
}

export function authHeader(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}
