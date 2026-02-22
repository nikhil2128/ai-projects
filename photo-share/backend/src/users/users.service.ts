import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly neo4jService: Neo4jService,
  ) {}

  async findByUsername(username: string, currentUserId?: number) {
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

    return {
      ...user,
      followersCount,
      followingCount,
      postsCount,
      isFollowing,
    };
  }

  async searchUsers(query: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.username LIKE :query', { query: `%${query}%` })
      .orWhere('user.displayName LIKE :query', { query: `%${query}%` })
      .limit(20)
      .getMany();
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
    return this.userRepository.findOneBy({ id: userId });
  }
}
