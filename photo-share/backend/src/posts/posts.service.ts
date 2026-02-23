import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository, In } from 'typeorm';
import { Queue } from 'bullmq';
import { Post } from './post.entity';
import { Reaction } from '../reactions/reaction.entity';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CacheService } from '../cache/cache.service';
import { StorageService } from '../storage/storage.service';
import { MetricsService } from '../metrics/metrics.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
    private readonly neo4jService: Neo4jService,
    private readonly cacheService: CacheService,
    private readonly storageService: StorageService,
    private readonly metricsService: MetricsService,
    @InjectQueue('feed-fanout') private readonly feedFanoutQueue: Queue,
    @InjectQueue('image-processing') private readonly imageQueue: Queue,
  ) {}

  async create(
    userId: number,
    dto: CreatePostDto,
    file: Express.Multer.File,
  ) {
    const uploadTimer = this.metricsService.imageUploadDuration.startTimer();

    // Upload to S3 with thumbnail generation
    const uploadResult = await this.storageService.uploadImage(file, userId);
    uploadTimer();

    const post = this.postRepository.create({
      userId,
      imageUrl: uploadResult.url,
      imageKey: uploadResult.key,
      thumbnailUrl: uploadResult.thumbnailUrl,
      caption: dto.caption,
      filter: dto.filter ?? 'none',
    });
    const saved = await this.postRepository.save(post);

    this.metricsService.postsCreated.inc();

    // Async: fan-out to followers' feeds
    await this.feedFanoutQueue.add('fanout', {
      postId: saved.id,
      userId,
    });

    // Async: run content moderation and metadata extraction
    await this.imageQueue.add('moderate', {
      key: uploadResult.key,
      userId,
      action: 'moderate',
    });

    return this.findOne(saved.id, userId);
  }

  /**
   * Hybrid fan-out feed: check Redis cache first, fall back to DB.
   * Uses cursor-based pagination for consistent results under high write volume.
   */
  async getFeed(userId: number, cursor?: string, limit = 20) {
    const timer = this.metricsService.feedLoadDuration.startTimer({ cache_hit: 'false' });

    const followingIds = await this.getFollowingIds(userId);
    followingIds.push(userId);

    if (followingIds.length === 0) {
      timer();
      return { posts: [], nextCursor: null, hasMore: false };
    }

    const qb = this.postRepository
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .where('post.userId IN (:...followingIds)', { followingIds })
      .orderBy('post.createdAt', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const cursorDate = new Date(Buffer.from(cursor, 'base64url').toString());
      qb.andWhere('post.createdAt < :cursor', { cursor: cursorDate });
    }

    const posts = await qb.getMany();
    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const postsWithReactions = await Promise.all(
      posts.map((post) => this.attachReactions(post, userId)),
    );

    const nextCursor = hasMore && posts.length > 0
      ? Buffer.from(posts[posts.length - 1].createdAt.toISOString()).toString('base64url')
      : null;

    timer();

    return { posts: postsWithReactions, nextCursor, hasMore };
  }

  // Also support legacy page-based pagination
  async getFeedPaginated(userId: number, page = 1, limit = 20) {
    const followingIds = await this.getFollowingIds(userId);
    followingIds.push(userId);

    const [posts, total] = await this.postRepository.findAndCount({
      where: { userId: In(followingIds) },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const postsWithReactions = await Promise.all(
      posts.map((post) => this.attachReactions(post, userId)),
    );

    return {
      posts: postsWithReactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserPosts(username: string, currentUserId: number) {
    const posts = await this.postRepository
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.user', 'user')
      .where('user.username = :username', { username })
      .orderBy('post.createdAt', 'DESC')
      .getMany();

    return Promise.all(
      posts.map((post) => this.attachReactions(post, currentUserId)),
    );
  }

  async findOne(postId: number, currentUserId: number) {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return this.attachReactions(post, currentUserId);
  }

  async deletePost(postId: number, userId: number) {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    if (post.userId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    // Delete from S3
    if (post.imageKey) {
      await this.storageService.deleteImage(post.imageKey).catch(() => {});
    }

    await this.postRepository.remove(post);

    // Invalidate caches
    await this.cacheService.invalidateReactionCounts(postId);

    return { message: 'Post deleted' };
  }

  private async getFollowingIds(userId: number): Promise<number[]> {
    // Check cache first
    const cacheKey = `following_ids:${userId}`;
    const cached = await this.cacheService.get<number[]>(cacheKey);
    if (cached) {
      this.metricsService.cacheHitRate.inc({ cache_type: 'following_ids' });
      return cached;
    }

    this.metricsService.cacheMissRate.inc({ cache_type: 'following_ids' });

    const followingIds = await this.neo4jService.read(async (tx) => {
      const result = await tx.run(
        `MATCH (me:User {id: $userId})-[:FOLLOWS]->(other:User)
         RETURN other.id AS id`,
        { userId },
      );
      return result.records.map(
        (r: { get: (key: string) => { toNumber: () => number } }) =>
          r.get('id').toNumber(),
      );
    });

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, followingIds, 300);
    return followingIds;
  }

  private async attachReactions(post: Post, currentUserId: number) {
    // Try cache first for reaction counts
    const cachedCounts = await this.cacheService.getCachedReactionCounts(post.id);
    if (cachedCounts) {
      this.metricsService.cacheHitRate.inc({ cache_type: 'reactions' });
      const userReactions = await this.reactionRepository.find({
        where: { postId: post.id, userId: currentUserId },
        select: ['emoji'],
      });
      return {
        ...post,
        reactionCounts: cachedCounts,
        userReactions: userReactions.map((r) => r.emoji),
        totalReactions: Object.values(cachedCounts).reduce((a, b) => a + b, 0),
      };
    }

    this.metricsService.cacheMissRate.inc({ cache_type: 'reactions' });

    const reactions = await this.reactionRepository.find({
      where: { postId: post.id },
    });

    const reactionCounts: Record<string, number> = {};
    const userReactions: string[] = [];

    for (const r of reactions) {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1;
      if (r.userId === currentUserId) {
        userReactions.push(r.emoji);
      }
    }

    // Cache reaction counts
    await this.cacheService.cacheReactionCounts(post.id, reactionCounts);

    return {
      ...post,
      reactionCounts,
      userReactions,
      totalReactions: reactions.length,
    };
  }
}
