import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { ProfileVerificationStatus } from '../users/profile-verification-status.enum';

describe('AuthService', () => {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  const jwt = { sign: jest.fn(), verify: jest.fn() } as unknown as JwtService;
  const config = { get: jest.fn().mockReturnValue('refresh-secret') };
  const search = { indexUser: jest.fn() };
  const neo4j = {
    write: jest.fn(async (work: (tx: { run: jest.Mock }) => Promise<void>) =>
      work({ run: jest.fn() }),
    ),
  };
  const screening = { screenNewProfile: jest.fn() };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      repo as never,
      jwt,
      config as never,
      search as never,
      neo4j as never,
      screening as never,
    );
    (jwt.sign as jest.Mock)
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');
  });

  it('register throws when username/email already exists', async () => {
    repo.findOne.mockResolvedValue({ id: 1 });

    await expect(
      service.register({
        username: 'alice',
        email: 'alice@example.com',
        password: 'secret',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('register rejects high-risk signups', async () => {
    repo.findOne.mockResolvedValue(null);
    screening.screenNewProfile.mockResolvedValue({
      score: 91,
      status: ProfileVerificationStatus.PENDING_REVIEW,
      reasons: ['email domain is disposable'],
      isRejected: true,
    });

    await expect(
      service.register({
        username: 'bot_123456',
        email: 'bot@mailinator.com',
        password: 'secret',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('register hashes password and returns auth response', async () => {
    repo.findOne.mockResolvedValue(null);
    screening.screenNewProfile.mockResolvedValue({
      score: 18,
      status: ProfileVerificationStatus.VERIFIED,
      reasons: [],
      isRejected: false,
    });
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
    repo.create.mockImplementation((d) => d);
    repo.save.mockResolvedValue({
      id: 12,
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
      verificationStatus: ProfileVerificationStatus.VERIFIED,
      isDiscoverable: true,
    });

    const res = await service.register({
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret',
      displayName: 'Alice',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        password: 'hashed',
        verificationStatus: ProfileVerificationStatus.VERIFIED,
      }),
    );
    expect(search.indexUser).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 12,
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
        verificationStatus: ProfileVerificationStatus.VERIFIED,
      },
    });
  });

  it('login throws on unknown user', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.login({ username: 'missing', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login throws on invalid password', async () => {
    repo.findOne.mockResolvedValue({
      id: 4,
      username: 'alice',
      email: 'alice@example.com',
      password: 'bad-hash',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      service.login({ username: 'alice', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login returns auth response on success', async () => {
    repo.findOne.mockResolvedValue({
      id: 4,
      username: 'alice',
      email: 'alice@example.com',
      password: 'hash',
      displayName: 'Alice',
      avatarUrl: '/a.png',
      verificationStatus: ProfileVerificationStatus.PENDING_REVIEW,
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const res = await service.login({ username: 'alice', password: 'secret' });

    expect(res.accessToken).toBe('access-token');
    expect(res.refreshToken).toBe('refresh-token');
    expect(res.user.verificationStatus).toBe(ProfileVerificationStatus.PENDING_REVIEW);
  });

  it('getProfile returns user from repository', async () => {
    repo.findOneOrFail.mockResolvedValue({ id: 77, username: 'x' });

    await expect(service.getProfile(77)).resolves.toEqual({
      id: 77,
      username: 'x',
    });
  });
});
