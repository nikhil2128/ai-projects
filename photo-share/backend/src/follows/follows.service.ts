import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Follow } from './follow.entity';
import { User } from '../users/user.entity';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followRepository: Repository<Follow>,
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

    const existing = await this.followRepository.findOne({
      where: { followerId, followingId: targetUser.id },
    });
    if (existing) {
      throw new ConflictException('Already following this user');
    }

    const follow = this.followRepository.create({
      followerId,
      followingId: targetUser.id,
    });
    await this.followRepository.save(follow);
    return { message: `Now following ${username}` };
  }

  async unfollow(followerId: number, username: string) {
    const targetUser = await this.userRepository.findOne({ where: { username } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    const follow = await this.followRepository.findOne({
      where: { followerId, followingId: targetUser.id },
    });
    if (!follow) {
      throw new NotFoundException('Not following this user');
    }

    await this.followRepository.remove(follow);
    return { message: `Unfollowed ${username}` };
  }

  async getFollowers(userId: number) {
    const follows = await this.followRepository.find({
      where: { followingId: userId },
      relations: ['follower'],
    });
    return follows.map((f) => f.follower);
  }

  async getFollowing(userId: number) {
    const follows = await this.followRepository.find({
      where: { followerId: userId },
      relations: ['following'],
    });
    return follows.map((f) => f.following);
  }
}
