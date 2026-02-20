import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  const jwt = { sign: jest.fn() } as unknown as JwtService;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(repo as never, jwt);
    (jwt.sign as jest.Mock) = jest.fn().mockReturnValue('token-1');
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

  it('register hashes password and returns auth response', async () => {
    repo.findOne.mockResolvedValue(null);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);
    repo.create.mockImplementation((d) => d);
    repo.save.mockResolvedValue({
      id: 12,
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      avatarUrl: null,
    });

    const res = await service.register({
      username: 'alice',
      email: 'alice@example.com',
      password: 'secret',
      displayName: 'Alice',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed' }),
    );
    expect(res).toEqual({
      accessToken: 'token-1',
      user: {
        id: 12,
        username: 'alice',
        email: 'alice@example.com',
        displayName: 'Alice',
        avatarUrl: null,
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
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const res = await service.login({ username: 'alice', password: 'secret' });

    expect(res.accessToken).toBe('token-1');
    expect(res.user.username).toBe('alice');
  });

  it('getProfile returns user from repository', async () => {
    repo.findOneOrFail.mockResolvedValue({ id: 77, username: 'x' });

    await expect(service.getProfile(77)).resolves.toEqual({
      id: 77,
      username: 'x',
    });
  });
});
