import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Post } from './post.entity';
import { Reaction } from '../reactions/reaction.entity';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CreatePostDto } from './dto/create-post.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Reaction)
    private readonly reactionRepository: Repository<Reaction>,
    private readonly neo4jService: Neo4jService,
  ) {}

  async create(userId: number, dto: CreatePostDto, imageUrl: string) {
    const post = this.postRepository.create({
      userId,
      imageUrl,
      caption: dto.caption,
      filter: dto.filter ?? 'none',
    });
    const saved = await this.postRepository.save(post);
    return this.findOne(saved.id, userId);
  }

  async getFeed(userId: number, page = 1, limit = 20) {
    const followingIds = await this.neo4jService.read(async (tx) => {
      const result = await tx.run(
        `MATCH (me:User {id: $userId})-[:FOLLOWS]->(other:User)
         RETURN other.id AS id`,
        { userId },
      );
      return result.records.map((r: { get: (key: string) => { toNumber: () => number } }) =>
        r.get('id').toNumber(),
      );
    });
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
    await this.postRepository.remove(post);
    return { message: 'Post deleted' };
  }

  private async attachReactions(post: Post, currentUserId: number) {
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

    return {
      ...post,
      reactionCounts,
      userReactions,
      totalReactions: reactions.length,
    };
  }
}
