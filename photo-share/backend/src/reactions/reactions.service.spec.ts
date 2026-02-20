import { NotFoundException } from '@nestjs/common';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  const reactionRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };
  const postRepository = {
    findOne: jest.fn(),
  };

  let service: ReactionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReactionsService(
      reactionRepository as never,
      postRepository as never,
    );
  });

  it('throws for unsupported emoji', async () => {
    await expect(service.toggleReaction(1, 10, 'x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when post does not exist', async () => {
    postRepository.findOne.mockResolvedValue(null);
    await expect(service.toggleReaction(1, 10, '❤️')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('removes existing reaction when already present', async () => {
    postRepository.findOne.mockResolvedValue({ id: 10 });
    reactionRepository.findOne.mockResolvedValue({
      id: 99,
      userId: 1,
      postId: 10,
      emoji: '❤️',
    });

    await expect(service.toggleReaction(1, 10, '❤️')).resolves.toEqual({
      action: 'removed',
      emoji: '❤️',
    });
    expect(reactionRepository.remove).toHaveBeenCalled();
  });

  it('adds reaction when none exists', async () => {
    postRepository.findOne.mockResolvedValue({ id: 10 });
    reactionRepository.findOne.mockResolvedValue(null);
    reactionRepository.create.mockImplementation((d) => d);

    await expect(service.toggleReaction(1, 10, '🔥')).resolves.toEqual({
      action: 'added',
      emoji: '🔥',
    });
    expect(reactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, postId: 10, emoji: '🔥' }),
    );
  });

  it('returns grouped counts for post reactions', async () => {
    reactionRepository.find.mockResolvedValue([
      { emoji: '🔥' },
      { emoji: '🔥' },
      { emoji: '😂' },
    ]);

    const res = await service.getPostReactions(10);
    expect(res.counts).toEqual({ '🔥': 2, '😂': 1 });
    expect(res.total).toBe(3);
  });
});
