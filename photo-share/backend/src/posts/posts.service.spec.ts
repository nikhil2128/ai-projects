import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';

const num = (value: number) => ({ toNumber: () => value });

describe('PostsService', () => {
  const postRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };
  const reactionRepository = {
    find: jest.fn(),
  };
  const neo4jService = {
    read: jest.fn(),
  };

  let service: PostsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostsService(
      postRepository as never,
      reactionRepository as never,
      neo4jService as never,
    );
  });

  it('create saves and returns enriched post', async () => {
    const saved = { id: 5, userId: 1, caption: 'hello', filter: 'none' };
    postRepository.create.mockReturnValue(saved);
    postRepository.save.mockResolvedValue(saved);
    postRepository.findOne.mockResolvedValue({
      ...saved,
      user: { id: 1, username: 'alice' },
    });
    reactionRepository.find.mockResolvedValue([
      { emoji: '🔥', userId: 1, postId: 5 },
      { emoji: '🔥', userId: 2, postId: 5 },
    ]);

    const res = await service.create(1, { caption: 'hello' }, '/uploads/x.png');

    expect(postRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: '/uploads/x.png', filter: 'none' }),
    );
    expect(res.totalReactions).toBe(2);
    expect(res.userReactions).toEqual(['🔥']);
  });

  it('getFeed returns paginated posts with reactions', async () => {
    neo4jService.read.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async () => ({
          records: [{ get: () => num(2) }],
        }),
      }),
    );
    postRepository.findAndCount.mockResolvedValue([
      [
        {
          id: 10,
          userId: 2,
          caption: 'A',
          createdAt: new Date().toISOString(),
          user: { username: 'bob' },
        },
      ],
      1,
    ]);
    reactionRepository.find.mockResolvedValue([{ emoji: '❤️', userId: 3, postId: 10 }]);

    const res = await service.getFeed(1, 2, 5);

    expect(postRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(res.page).toBe(2);
    expect(res.totalPages).toBe(1);
    expect(res.posts[0].reactionCounts).toEqual({ '❤️': 1 });
  });

  it('getUserPosts returns posts for username with reactions', async () => {
    const getMany = jest.fn().mockResolvedValue([{ id: 11, userId: 2 }]);
    const qb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany,
    };
    postRepository.createQueryBuilder.mockReturnValue(qb);
    reactionRepository.find.mockResolvedValue([]);

    const res = await service.getUserPosts('bob', 1);

    expect(qb.where).toHaveBeenCalledWith('user.username = :username', {
      username: 'bob',
    });
    expect(res[0].totalReactions).toBe(0);
  });

  it('findOne throws when post does not exist', async () => {
    postRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne(99, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletePost throws when user is not owner', async () => {
    postRepository.findOne.mockResolvedValue({ id: 4, userId: 100 });
    await expect(service.deletePost(4, 2)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletePost removes post when owner', async () => {
    postRepository.findOne.mockResolvedValue({ id: 4, userId: 2 });
    postRepository.remove.mockResolvedValue(undefined);

    await expect(service.deletePost(4, 2)).resolves.toEqual({
      message: 'Post deleted',
    });
    expect(postRepository.remove).toHaveBeenCalled();
  });
});
