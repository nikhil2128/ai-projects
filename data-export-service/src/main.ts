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

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors();

  if (configService.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Data Export Service')
      .setDescription(
        'Async CSV export service. Accepts a paginated API URL, fetches all data, ' +
          'generates a CSV, uploads to S3, and emails a download link.',
      )
      .setVersion('1.0')
      .addTag('Exports', 'Create and track CSV export jobs')
      .addTag('Health', 'Application health checks')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger docs available at /api/docs');
  }

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.log(`Data Export Service running on port ${port}`);
  logger.log(`Environment: ${configService.get<string>('nodeEnv')}`);
}

bootstrap();
