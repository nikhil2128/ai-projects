import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CacheService } from '../cache/cache.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly neo4jService: Neo4jService,
    private readonly cacheService: CacheService,
    private readonly searchService: SearchService,
  ) {}

  async findByUsername(username: string, currentUserId?: number) {
    // Check cache first
    const cached = await this.cacheService.getCachedUserProfile<{
      followersCount: number;
      followingCount: number;
      postsCount: number;
      isFollowing: boolean;
    } & User>(username);

    if (cached && currentUserId) {
      // Re-check isFollowing for current user since it's user-specific
      const isFollowing = await this.checkIsFollowing(currentUserId, cached.id);
      return { ...cached, isFollowing };
    }

    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const postsCount = await this.userRepository.manager.count('posts', {
      where: { userId: user.id },
    });

    const { followersCount, followingCount, isFollowing } =
      await this.neo4jService.read(async (tx) => {
        const result = await tx.run(
          `OPTIONAL MATCH (:User)-[f:FOLLOWS]->(me:User {id: $userId})
           WITH count(f) AS followers
           OPTIONAL MATCH (me:User {id: $userId})-[g:FOLLOWS]->(:User)
           WITH followers, count(g) AS following
           OPTIONAL MATCH (cur:User {id: $currentUserId})-[h:FOLLOWS]->(target:User {id: $userId})
           RETURN followers, following, count(h) > 0 AS isFollowing`,
          { userId: user.id, currentUserId: currentUserId ?? -1 },
        );
        const record = result.records[0];
        return {
          followersCount: record?.get('followers')?.toNumber() ?? 0,
          followingCount: record?.get('following')?.toNumber() ?? 0,
          isFollowing: currentUserId ? (record?.get('isFollowing') ?? false) : false,
        };
      });

    const profile = {
      ...user,
      followersCount,
      followingCount,
      postsCount,
      isFollowing,
    };

    // Cache the profile (without user-specific isFollowing)
    await this.cacheService.cacheUserProfile(username, {
      ...profile,
      isFollowing: false,
    });

    return profile;
  }

  async searchUsers(query: string) {
    // Use Elasticsearch if available for sub-10ms search at scale
    if (this.searchService.isEnabled()) {
      return this.searchService.search(query);
    }

    // Fallback to database LIKE query
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.username LIKE :query', { query: `%${query}%` })
      .orWhere('user.displayName LIKE :query', { query: `%${query}%` })
      .limit(20)
      .getMany();
  }

  async suggestUsers(prefix: string) {
    if (this.searchService.isEnabled()) {
      return this.searchService.suggest(prefix);
    }
    return this.searchUsers(prefix);
  }

  async updateLocation(
    userId: number,
    latitude: number,
    longitude: number,
    locationName?: string,
  ) {
    await this.userRepository.update(userId, {
      latitude,
      longitude,
      locationName: locationName ?? null,
      locationUpdatedAt: new Date(),
    });

    const user = await this.userRepository.findOneBy({ id: userId });
    if (user) {
      await this.cacheService.invalidateUserProfile(user.username);
    }
    return user;
  }

  private async checkIsFollowing(currentUserId: number, targetUserId: number): Promise<boolean> {
    return this.neo4jService.read(async (tx) => {
      const result = await tx.run(
        `MATCH (a:User {id: $currentUserId})-[r:FOLLOWS]->(b:User {id: $targetUserId})
         RETURN count(r) > 0 AS isFollowing`,
        { currentUserId, targetUserId },
      );
      return result.records[0]?.get('isFollowing') ?? false;
    });
  }
}
