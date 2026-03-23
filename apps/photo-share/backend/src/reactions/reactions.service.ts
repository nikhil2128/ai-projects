import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reaction } from './reaction.entity';
import { Post } from '../posts/post.entity';
import { CacheService } from '../cache/cache.service';

const ALLOWED_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '💯', '🎉', '😍'];

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly cacheService: CacheService,
  ) {}

  async toggleReaction(userId: number, postId: number, emoji: string) {
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      throw new NotFoundException(
        `Invalid emoji. Allowed: ${ALLOWED_EMOJIS.join(' ')}`,
      );
    }

    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existing = await this.reactionRepository.findOne({
      where: { userId, postId, emoji },
    });

    let action: string;
    if (existing) {
      await this.reactionRepository.remove(existing);
      // Update denormalized count
      await this.postRepository.decrement({ id: postId }, 'reactionCount', 1);
      action = 'removed';
    } else {
      const reaction = this.reactionRepository.create({ userId, postId, emoji });
      await this.reactionRepository.save(reaction);
      await this.postRepository.increment({ id: postId }, 'reactionCount', 1);
      action = 'added';
    }

    // Invalidate cached reaction counts
    await this.cacheService.invalidateReactionCounts(postId);

    return { action, emoji };
  }

  async getPostReactions(postId: number) {
    // Check cache first
    const cachedCounts = await this.cacheService.getCachedReactionCounts(postId);
    if (cachedCounts) {
      const total = Object.values(cachedCounts).reduce((a, b) => a + b, 0);
      return { counts: cachedCounts, total };
    }

    const reactions = await this.reactionRepository.find({
      where: { postId },
    });

    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }

    // Cache the counts
    await this.cacheService.cacheReactionCounts(postId, counts);

    return { counts, total: reactions.length };
  }
}
