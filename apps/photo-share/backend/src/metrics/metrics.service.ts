import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private register!: client.Registry;

  readonly httpRequestDuration: client.Histogram;
  readonly httpRequestTotal: client.Counter;
  readonly activeConnections: client.Gauge;
  readonly postsCreated: client.Counter;
  readonly imageUploadDuration: client.Histogram;
  readonly feedLoadDuration: client.Histogram;
  readonly cacheHitRate: client.Counter;
  readonly cacheMissRate: client.Counter;

  constructor() {
    this.register = new client.Registry();

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.activeConnections = new client.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });

    this.postsCreated = new client.Counter({
      name: 'posts_created_total',
      help: 'Total posts created',
      registers: [this.register],
    });

    this.imageUploadDuration = new client.Histogram({
      name: 'image_upload_duration_seconds',
      help: 'Duration of image uploads including processing',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    this.feedLoadDuration = new client.Histogram({
      name: 'feed_load_duration_seconds',
      help: 'Duration of feed loading',
      labelNames: ['cache_hit'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.register],
    });

    this.cacheHitRate = new client.Counter({
      name: 'cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_type'],
      registers: [this.register],
    });

    this.cacheMissRate = new client.Counter({
      name: 'cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_type'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    client.collectDefaultMetrics({ register: this.register });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
