import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CacheService } from '../cache/cache.service';
import { User } from '../users/user.entity';
import { FollowedUser } from './follow.interface';
import { ProfileVerificationStatus } from '../users/profile-verification-status.enum';

@Injectable()
export class FollowsService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly cacheService: CacheService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async follow(followerId: number, username: string) {
    const follower = await this.userRepository.findOne({
      where: { id: followerId },
      select: ['id', 'verificationStatus'],
    });

    if (!follower) {
      throw new NotFoundException('User not found');
    }

    if (follower.verificationStatus === ProfileVerificationStatus.PENDING_REVIEW) {
      throw new ForbiddenException(
        'Your profile is under automated review. Follow actions will unlock after verification.',
      );
    }

    const targetUser = await this.userRepository.findOne({
      where: {
        username,
        isDiscoverable: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (targetUser.id === followerId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const created = await this.neo4jService.write(async (tx) => {
      const existing = await tx.run(
        `MATCH (a:User {id: $followerId})-[r:FOLLOWS]->(b:User {id: $followingId})
         RETURN r`,
        { followerId, followingId: targetUser.id },
      );
      if (existing.records.length > 0) {
        return false;
      }

      await tx.run(
        `MERGE (a:User {id: $followerId})
         MERGE (b:User {id: $followingId})
         CREATE (a)-[:FOLLOWS {createdAt: datetime()}]->(b)`,
        { followerId, followingId: targetUser.id },
      );
      return true;
    });

    if (!created) {
      throw new ConflictException('Already following this user');
    }

    // Invalidate affected caches
    await Promise.all([
      this.cacheService.del(`following_ids:${followerId}`),
      this.cacheService.invalidateFeed(followerId),
      this.cacheService.invalidateUserProfile(username),
    ]);

    return { message: `Now following ${username}` };
  }

  async unfollow(followerId: number, username: string) {
    const targetUser = await this.userRepository.findOne({ where: { username } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const deleted = await this.neo4jService.write(async (tx) => {
      const result = await tx.run(
        `MATCH (a:User {id: $followerId})-[r:FOLLOWS]->(b:User {id: $followingId})
         DELETE r
         RETURN count(r) AS count`,
        { followerId, followingId: targetUser.id },
      );
      const count = result.records[0]?.get('count')?.toNumber() ?? 0;
      return count > 0;
    });

    if (!deleted) {
      throw new NotFoundException('Not following this user');
    }

    // Invalidate affected caches
    await Promise.all([
      this.cacheService.del(`following_ids:${followerId}`),
      this.cacheService.invalidateFeed(followerId),
      this.cacheService.invalidateUserProfile(username),
    ]);

    return { message: `Unfollowed ${username}` };
  }

  async getFollowers(userId: number, cursor?: string, limit = 50): Promise<{
    users: FollowedUser[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    return this.neo4jService.read(async (tx) => {
      let query = `MATCH (follower:User)-[r:FOLLOWS]->(me:User {id: $userId})`;
      const params: Record<string, unknown> = { userId, limit: limit + 1 };

      if (cursor) {
        const cursorDate = Buffer.from(cursor, 'base64url').toString();
        query += ` WHERE r.createdAt < datetime($cursor)`;
        params.cursor = cursorDate;
      }

      query += ` RETURN follower.id AS id, r.createdAt AS followedAt
                  ORDER BY r.createdAt DESC
                  LIMIT $limit`;

      const result = await tx.run(query, params);

      const followerIds = result.records.map(
        (r: { get: (key: string) => { toNumber: () => number } }) =>
          r.get('id').toNumber(),
      );
      if (followerIds.length === 0) {
        return { users: [], nextCursor: null, hasMore: false };
      }

      const hasMore = followerIds.length > limit;
      if (hasMore) followerIds.pop();

      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...ids)', { ids: followerIds })
        .andWhere('user.isDiscoverable = :isDiscoverable', { isDiscoverable: true })
        .getMany();

      const userMap = new Map(users.map((u) => [u.id, u]));
      const records = result.records.slice(0, limit);

      const followedUsers = records
        .map((r: { get: (key: string) => { toNumber: () => number; toString: () => string } }) => {
          const user = userMap.get(r.get('id').toNumber());
          if (!user) return null;
          return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            followedAt: new Date(r.get('followedAt').toString()),
          };
        })
        .filter((u: FollowedUser | null): u is FollowedUser => u !== null);

      const lastRecord = records[records.length - 1];
      const nextCursor = hasMore && lastRecord
        ? Buffer.from(lastRecord.get('followedAt').toString()).toString('base64url')
        : null;

      return { users: followedUsers, nextCursor, hasMore };
    });
  }

  async getFollowing(userId: number, cursor?: string, limit = 50): Promise<{
    users: FollowedUser[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    return this.neo4jService.read(async (tx) => {
      let query = `MATCH (me:User {id: $userId})-[r:FOLLOWS]->(following:User)`;
      const params: Record<string, unknown> = { userId, limit: limit + 1 };

      if (cursor) {
        const cursorDate = Buffer.from(cursor, 'base64url').toString();
        query += ` WHERE r.createdAt < datetime($cursor)`;
        params.cursor = cursorDate;
      }

      query += ` RETURN following.id AS id, r.createdAt AS followedAt
                  ORDER BY r.createdAt DESC
                  LIMIT $limit`;

      const result = await tx.run(query, params);

      const followingIds = result.records.map(
        (r: { get: (key: string) => { toNumber: () => number } }) =>
          r.get('id').toNumber(),
      );
      if (followingIds.length === 0) {
        return { users: [], nextCursor: null, hasMore: false };
      }

      const hasMore = followingIds.length > limit;
      if (hasMore) followingIds.pop();

      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...ids)', { ids: followingIds })
        .andWhere('user.isDiscoverable = :isDiscoverable', { isDiscoverable: true })
        .getMany();

      const userMap = new Map(users.map((u) => [u.id, u]));
      const records = result.records.slice(0, limit);

      const followedUsers = records
        .map((r: { get: (key: string) => { toNumber: () => number; toString: () => string } }) => {
          const user = userMap.get(r.get('id').toNumber());
          if (!user) return null;
          return {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            followedAt: new Date(r.get('followedAt').toString()),
          };
        })
        .filter((u: FollowedUser | null): u is FollowedUser => u !== null);

      const lastRecord = records[records.length - 1];
      const nextCursor = hasMore && lastRecord
        ? Buffer.from(lastRecord.get('followedAt').toString()).toString('base64url')
        : null;

      return { users: followedUsers, nextCursor, hasMore };
    });
  }
}
