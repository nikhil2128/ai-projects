import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Follow } from '../follows/follow.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
  ) {}

  async findByUsername(username: string, currentUserId?: number) {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [followersCount, followingCount, postsCount] = await Promise.all([
      this.followRepository.count({ where: { followingId: user.id } }),
      this.followRepository.count({ where: { followerId: user.id } }),
      this.userRepository.manager.count('posts', { where: { userId: user.id } }),
    ]);

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await this.followRepository.findOne({
        where: { followerId: currentUserId, followingId: user.id },
      });
      isFollowing = !!follow;
    }

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
}
