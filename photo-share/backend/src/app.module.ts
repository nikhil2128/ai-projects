import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { FollowsModule } from './follows/follows.module';
import { ReactionsModule } from './reactions/reactions.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { VerificationModule } from './verification/verification.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { CacheModule } from './cache/cache.module';
import { StorageModule } from './storage/storage.module';
import { SearchModule } from './search/search.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        if (dbUrl) {
          return {
            type: 'postgres' as const,
            url: dbUrl,
            autoLoadEntities: true,
            synchronize: configService.get<string>('NODE_ENV') !== 'production',
            logging: configService.get<string>('NODE_ENV') === 'development',
            extra: {
              max: 50,
              min: 5,
              idleTimeoutMillis: 30000,
              connectionTimeoutMillis: 5000,
              statement_timeout: 10000,
            },
          };
        }
        // Fallback to SQLite for local development without Docker
        return {
          type: 'better-sqlite3' as const,
          database: 'photo-share.db',
          autoLoadEntities: true,
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('THROTTLE_TTL') ?? 60) * 1000,
            limit: configService.get<number>('THROTTLE_LIMIT') ?? 100,
          },
        ],
      }),
      inject: [ConfigService],
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    // Infrastructure modules
    CacheModule,
    StorageModule,
    SearchModule,
    QueueModule,
    Neo4jModule,
    HealthModule,
    MetricsModule,

    // Feature modules
    AuthModule,
    UsersModule,
    PostsModule,
    FollowsModule,
    ReactionsModule,
    RecommendationsModule,
    VerificationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
