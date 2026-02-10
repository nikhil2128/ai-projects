import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { InvoicesModule } from './invoices/invoices.module';
import { HealthModule } from './health/health.module';
import { Invoice } from './invoices/entities/invoice.entity';

@Module({
  imports: [
    // ── Configuration ───────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),

    // ── Database ────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [Invoice],
        synchronize: config.get<string>('nodeEnv') !== 'production',
        logging: config.get<string>('nodeEnv') === 'development' ? ['error', 'warn'] : ['error'],
        // Connection pool for scalability
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),

    // ── Queue (BullMQ + Redis) ──────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),

    // ── Rate Limiting ───────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('throttle.ttlSeconds') ?? 60) * 1000,
            limit: config.get<number>('throttle.limit') ?? 200,
          },
        ],
      }),
    }),

    // ── Feature Modules ─────────────────────────────────────────
    InvoicesModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
