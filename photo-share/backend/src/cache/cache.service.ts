import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = new Redis(
      this.configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
      {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        enableReadyCheck: true,
        lazyConnect: false,
      },
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    const pipeline = this.client.pipeline();
    let count = 0;

    return new Promise((resolve, reject) => {
      stream.on('data', (keys: string[]) => {
        for (const key of keys) {
          pipeline.del(key);
          count++;
        }
      });
      stream.on('end', async () => {
        if (count > 0) await pipeline.exec();
        resolve();
      });
      stream.on('error', reject);
    });
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  // Feed cache: store user's feed post IDs for fast retrieval
  async cacheFeed(userId: number, postIds: number[], ttl = 600): Promise<void> {
    const key = `feed:${userId}`;
    await this.client.del(key);
    if (postIds.length > 0) {
      await this.client.rpush(key, ...postIds.map(String));
      await this.client.expire(key, ttl);
    }
  }

  async getCachedFeed(userId: number, offset: number, limit: number): Promise<number[] | null> {
    const key = `feed:${userId}`;
    const exists = await this.client.exists(key);
    if (!exists) return null;
    const ids = await this.client.lrange(key, offset, offset + limit - 1);
    return ids.map(Number);
  }

  async invalidateFeed(userId: number): Promise<void> {
    await this.client.del(`feed:${userId}`);
  }

  // Reaction count cache
  async cacheReactionCounts(
    postId: number,
    counts: Record<string, number>,
    ttl = 300,
  ): Promise<void> {
    await this.set(`reactions:${postId}`, counts, ttl);
  }

  async getCachedReactionCounts(postId: number): Promise<Record<string, number> | null> {
    return this.get<Record<string, number>>(`reactions:${postId}`);
  }

  async invalidateReactionCounts(postId: number): Promise<void> {
    await this.del(`reactions:${postId}`);
  }

  // User profile cache
  async cacheUserProfile(username: string, profile: unknown, ttl = 120): Promise<void> {
    await this.set(`user:${username}`, profile, ttl);
  }

  async getCachedUserProfile<T>(username: string): Promise<T | null> {
    return this.get<T>(`user:${username}`);
  }

  async invalidateUserProfile(username: string): Promise<void> {
    await this.del(`user:${username}`);
  }
}
