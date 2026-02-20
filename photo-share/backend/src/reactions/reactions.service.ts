import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reaction } from './reaction.entity';
import { Post } from '../posts/post.entity';

const ALLOWED_EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👏', '🔥', '💯', '🎉', '😍'];

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
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

    if (existing) {
      await this.reactionRepository.remove(existing);
      return { action: 'removed', emoji };
    }

    const reaction = this.reactionRepository.create({ userId, postId, emoji });
    await this.reactionRepository.save(reaction);
    return { action: 'added', emoji };
  }

  async getPostReactions(postId: number) {
    const reactions = await this.reactionRepository.find({
      where: { postId },
      relations: ['user'],
    });

    const counts: Record<string, number> = {};
    for (const r of reactions) {
      counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    }

    return { reactions, counts, total: reactions.length };
  }
}
