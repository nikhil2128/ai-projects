import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CacheService } from '../cache/cache.service';
import { Neo4jService } from '../neo4j/neo4j.service';

interface FeedFanoutJobData {
  postId: number;
  userId: number;
}

/**
 * Fan-out on write: when a user creates a post, push the post ID
 * into cached feeds of all their followers. For users with > 10K
 * followers (celebrities), we skip fan-out and use fan-out on read.
 */
@Processor('feed-fanout')
export class FeedFanoutProcessor extends WorkerHost {
  private readonly logger = new Logger(FeedFanoutProcessor.name);
  private static readonly CELEBRITY_THRESHOLD = 10_000;

  constructor(
    private readonly cacheService: CacheService,
    private readonly neo4jService: Neo4jService,
  ) {
    super();
  }

  async process(job: Job<FeedFanoutJobData>) {
    const { postId, userId } = job.data;

    const followerIds = await this.neo4jService.read(async (tx) => {
      const result = await tx.run(
        `MATCH (follower:User)-[:FOLLOWS]->(me:User {id: $userId})
         RETURN follower.id AS id`,
        { userId },
      );
      return result.records.map(
        (r: { get: (key: string) => { toNumber: () => number } }) =>
          r.get('id').toNumber(),
      );
    });

    if (followerIds.length > FeedFanoutProcessor.CELEBRITY_THRESHOLD) {
      this.logger.log(
        `Skipping fan-out for celebrity user ${userId} (${followerIds.length} followers)`,
      );
      return;
    }

    const client = this.cacheService.getClient();
    const pipeline = client.pipeline();

    for (const followerId of followerIds) {
      const key = `feed:${followerId}`;
      pipeline.lpush(key, String(postId));
      pipeline.ltrim(key, 0, 999);
    }

    await pipeline.exec();
    this.logger.log(`Fan-out post ${postId} to ${followerIds.length} followers`);
  }
}
