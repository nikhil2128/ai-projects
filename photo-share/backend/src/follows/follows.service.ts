import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Neo4jService } from '../neo4j/neo4j.service';
import { User } from '../users/user.entity';
import { FollowedUser } from './follow.interface';

@Injectable()
export class FollowsService {
  constructor(
    private readonly neo4jService: Neo4jService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async follow(followerId: number, username: string) {
    const targetUser = await this.userRepository.findOne({ where: { username } });
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

    return { message: `Unfollowed ${username}` };
  }

  async getFollowers(userId: number): Promise<FollowedUser[]> {
    return this.neo4jService.read(async (tx) => {
      const result = await tx.run(
        `MATCH (follower:User)-[r:FOLLOWS]->(me:User {id: $userId})
         RETURN follower.id AS id, r.createdAt AS followedAt
         ORDER BY r.createdAt DESC`,
        { userId },
      );

      const followerIds = result.records.map(
        (r: { get: (key: string) => { toNumber: () => number } }) =>
          r.get('id').toNumber(),
      );
      if (followerIds.length === 0) return [];

      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...ids)', { ids: followerIds })
        .getMany();

      const userMap = new Map(users.map((u) => [u.id, u]));
      return result.records
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
    });
  }

  async getFollowing(userId: number): Promise<FollowedUser[]> {
    return this.neo4jService.read(async (tx) => {
      const result = await tx.run(
        `MATCH (me:User {id: $userId})-[r:FOLLOWS]->(following:User)
         RETURN following.id AS id, r.createdAt AS followedAt
         ORDER BY r.createdAt DESC`,
        { userId },
      );

      const followingIds = result.records.map(
        (r: { get: (key: string) => { toNumber: () => number } }) =>
          r.get('id').toNumber(),
      );
      if (followingIds.length === 0) return [];

      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id IN (:...ids)', { ids: followingIds })
        .getMany();

      const userMap = new Map(users.map((u) => [u.id, u]));
      return result.records
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
    });
  }
}
