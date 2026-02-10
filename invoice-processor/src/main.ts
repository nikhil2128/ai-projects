import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);

  // ── Global prefix ─────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation pipe ───────────────────────────────────────────
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

  // ── Global exception filter ───────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── CORS ──────────────────────────────────────────────────────
  app.enableCors();

  // ── Swagger / OpenAPI ─────────────────────────────────────────
  if (configService.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Invoice Processor API')
      .setDescription(
        'Production-ready API for uploading, processing, and searching invoices. ' +
          'PDF invoices are processed asynchronously via a queue-based architecture.',
      )
      .setVersion('1.0')
      .addTag('Invoices', 'Upload, check status, and search invoices')
      .addTag('Health', 'Application health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs available at /api/docs');
  }

  // ── Start server ──────────────────────────────────────────────
  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('nodeEnv')}`);
}

bootstrap();
