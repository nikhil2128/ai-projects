import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

const num = (value: number) => ({ toNumber: () => value });

describe('UsersService', () => {
  const userRepository = {
    findOne: jest.fn(),
    manager: { count: jest.fn() },
    createQueryBuilder: jest.fn(),
  };
  const neo4jService = {
    read: jest.fn(),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(userRepository as never, neo4jService as never);
  });

  it('findByUsername throws when user does not exist', async () => {
    userRepository.findOne.mockResolvedValue(null);
    await expect(service.findByUsername('none')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findByUsername returns profile stats and follow status', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 2,
      username: 'bob',
      displayName: 'Bob',
    });
    userRepository.manager.count.mockResolvedValue(9);
    neo4jService.read.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async () => ({
          records: [
            {
              get: (k: string) =>
                k === 'followers'
                  ? num(10)
                  : k === 'following'
                    ? num(3)
                    : true,
            },
          ],
        }),
      }),
    );

    const res = await service.findByUsername('bob', 1);
    expect(res.followersCount).toBe(10);
    expect(res.followingCount).toBe(3);
    expect(res.postsCount).toBe(9);
    expect(res.isFollowing).toBe(true);
  });

  it('findByUsername sets isFollowing=false for anonymous current user', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 2,
      username: 'bob',
      displayName: 'Bob',
    });
    userRepository.manager.count.mockResolvedValue(0);
    neo4jService.read.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({
        run: async () => ({
          records: [
            {
              get: (k: string) =>
                k === 'followers' ? num(0) : k === 'following' ? num(0) : true,
            },
          ],
        }),
      }),
    );

    const res = await service.findByUsername('bob');
    expect(res.isFollowing).toBe(false);
  });

  it('searchUsers queries username/displayName with limit', async () => {
    const getMany = jest.fn().mockResolvedValue([{ id: 1, username: 'alice' }]);
    const qb = {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany,
    };
    userRepository.createQueryBuilder.mockReturnValue(qb);

    await expect(service.searchUsers('al')).resolves.toEqual([
      { id: 1, username: 'alice' },
    ]);
    expect(qb.limit).toHaveBeenCalledWith(20);
  });

  it('findByUsername handles missing neo4j record safely', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 9,
      username: 'dave',
      displayName: 'Dave',
    });
    userRepository.manager.count.mockResolvedValue(2);
    neo4jService.read.mockImplementation(async (work: (tx: unknown) => unknown) =>
      work({ run: async () => ({ records: [] }) }),
    );

    const res = await service.findByUsername('dave', 5);
    expect(res.followersCount).toBe(0);
    expect(res.followingCount).toBe(0);
    expect(res.isFollowing).toBe(false);
  });
});
