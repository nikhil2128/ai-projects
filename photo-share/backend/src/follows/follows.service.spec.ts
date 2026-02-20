import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FollowsService } from './follows.service';

const n = (value: number) => ({ toNumber: () => value });

describe('FollowsService', () => {
  const neo4jService = {
    write: jest.fn(),
    read: jest.fn(),
  };
  const userRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  let service: FollowsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FollowsService(neo4jService as never, userRepository as never);
  });

  it('follow throws when user does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);
    await expect(service.follow(1, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('follow throws when trying to follow self', async () => {
    userRepository.findOne.mockResolvedValue({ id: 1, username: 'me' });
    await expect(service.follow(1, 'me')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('follow throws conflict when already following', async () => {
    userRepository.findOne.mockResolvedValue({ id: 2, username: 'bob' });
    neo4jService.write.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async (query: string) =>
          query.includes('RETURN r')
            ? { records: [{ get: () => null }] }
            : { records: [] },
      }),
    );

    await expect(service.follow(1, 'bob')).rejects.toBeInstanceOf(ConflictException);
  });

  it('follow returns message when created', async () => {
    userRepository.findOne.mockResolvedValue({ id: 2, username: 'bob' });
    const run = jest
      .fn()
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({ records: [] });
    neo4jService.write.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({ run }),
    );

    await expect(service.follow(1, 'bob')).resolves.toEqual({
      message: 'Now following bob',
    });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('unfollow throws not found when target user missing', async () => {
    userRepository.findOne.mockResolvedValue(null);
    await expect(service.unfollow(1, 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('unfollow throws when no relationship deleted', async () => {
    userRepository.findOne.mockResolvedValue({ id: 2, username: 'bob' });
    neo4jService.write.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async () => ({ records: [{ get: () => n(0) }] }),
      }),
    );

    await expect(service.unfollow(1, 'bob')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('unfollow succeeds when relationship exists', async () => {
    userRepository.findOne.mockResolvedValue({ id: 2, username: 'bob' });
    neo4jService.write.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async () => ({ records: [{ get: () => n(1) }] }),
      }),
    );

    await expect(service.unfollow(1, 'bob')).resolves.toEqual({
      message: 'Unfollowed bob',
    });
  });

  it('getFollowers returns empty list when none found', async () => {
    neo4jService.read.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({ run: async () => ({ records: [] }) }),
    );
    await expect(service.getFollowers(1)).resolves.toEqual([]);
  });

  it('getFollowers maps ids to user records', async () => {
    neo4jService.read.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async () => ({
          records: [
            {
              get: (k: string) =>
                k === 'id'
                  ? n(2)
                  : { toString: () => '2026-02-01T00:00:00.000Z' },
            },
          ],
        }),
      }),
    );
    const qb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 2, username: 'bob' }]),
    };
    userRepository.createQueryBuilder.mockReturnValue(qb);

    const res = await service.getFollowers(1);
    expect(res).toHaveLength(1);
    expect(res[0].username).toBe('bob');
  });

  it('getFollowing maps ids to user records', async () => {
    neo4jService.read.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async () => ({
          records: [
            {
              get: (k: string) =>
                k === 'id'
                  ? n(3)
                  : { toString: () => '2026-02-01T00:00:00.000Z' },
            },
          ],
        }),
      }),
    );
    const qb = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 3, username: 'cara' }]),
    };
    userRepository.createQueryBuilder.mockReturnValue(qb);

    const res = await service.getFollowing(1);
    expect(res[0].username).toBe('cara');
  });
});
