import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for the Invoices API.
 *
 * These require running PostgreSQL and Redis instances.
 * Run `docker compose up -d postgres redis` before executing.
 */
describe('Invoices API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/invoices/upload', () => {
    it('should reject requests without a file', () => {
      return request(app.getHttpServer())
        .post('/api/v1/invoices/upload')
        .expect(400);
    });

    it('should reject non-PDF files', () => {
      return request(app.getHttpServer())
        .post('/api/v1/invoices/upload')
        .attach('file', Buffer.from('hello'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('should accept a PDF file and return 202', () => {
      // Minimal PDF content
      const pdfContent = Buffer.from('%PDF-1.4 fake content for testing');

      return request(app.getHttpServer())
        .post('/api/v1/invoices/upload')
        .attach('file', pdfContent, {
          filename: 'test-invoice.pdf',
          contentType: 'application/pdf',
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.status).toBe('pending');
          expect(res.body.originalFilename).toBe('test-invoice.pdf');
        });
    });
  });

  describe('GET /api/v1/invoices/:id/status', () => {
    it('should return 404 for unknown invoice ID', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/00000000-0000-0000-0000-000000000000/status')
        .expect(404);
    });
  });

  describe('GET /api/v1/invoices/search', () => {
    it('should return empty results initially', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/search')
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta).toBeDefined();
          expect(res.body.meta.totalItems).toBeGreaterThanOrEqual(0);
        });
    });

    it('should reject invalid pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/invoices/search?page=-1')
        .expect(400);
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });
});
