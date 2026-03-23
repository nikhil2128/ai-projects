import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { ProfileVerificationStatus } from './profile-verification-status.enum';

const num = (value: number) => ({ toNumber: () => value });

describe('UsersService', () => {
  const userRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    manager: { count: jest.fn() },
    createQueryBuilder: jest.fn(),
  };
  const neo4jService = {
    read: jest.fn(),
  };
  const cacheService = {
    getCachedUserProfile: jest.fn(),
    cacheUserProfile: jest.fn(),
    invalidateUserProfile: jest.fn(),
  };
  const searchService = {
    isEnabled: jest.fn(),
    search: jest.fn(),
    suggest: jest.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    searchService.isEnabled.mockReturnValue(false);
    service = new UsersService(
      userRepository as never,
      neo4jService as never,
      cacheService as never,
      searchService as never,
    );
  });

  it('findByUsername throws when user does not exist', async () => {
    cacheService.getCachedUserProfile.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.findByUsername('none')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findByUsername returns profile stats and follow status', async () => {
    cacheService.getCachedUserProfile.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({
      id: 2,
      username: 'bob',
      displayName: 'Bob',
      verificationStatus: ProfileVerificationStatus.VERIFIED,
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

  it('findByUsername hides pending profile from other users', async () => {
    cacheService.getCachedUserProfile.mockResolvedValue(null);
    userRepository.findOne.mockResolvedValue({
      id: 8,
      username: 'pending-user',
      verificationStatus: ProfileVerificationStatus.PENDING_REVIEW,
    });

    await expect(service.findByUsername('pending-user', 1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('searchUsers queries only discoverable profiles in fallback mode', async () => {
    const getMany = jest.fn().mockResolvedValue([{ id: 1, username: 'alice' }]);
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany,
    };
    userRepository.createQueryBuilder.mockReturnValue(qb);

    await expect(service.searchUsers('al')).resolves.toEqual([
      { id: 1, username: 'alice' },
    ]);
    expect(qb.where).toHaveBeenCalledWith('user.isDiscoverable = :isDiscoverable', {
      isDiscoverable: true,
    });
    expect(qb.limit).toHaveBeenCalledWith(20);
  });

  it('searchUsers delegates to search service when enabled', async () => {
    searchService.isEnabled.mockReturnValue(true);
    searchService.search.mockResolvedValue([{ id: 3, username: 'ser' }]);

    await expect(service.searchUsers('se')).resolves.toEqual([
      { id: 3, username: 'ser' },
    ]);
    expect(searchService.search).toHaveBeenCalledWith('se');
  });
});
