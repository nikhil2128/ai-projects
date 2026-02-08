import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: User = {
    id: 'user-uuid',
    email: 'john@example.com',
    password: 'hashed',
    firstName: 'John',
    lastName: 'Doe',
    role: Role.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-jwt-secret'),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user when valid payload and user is active', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await strategy.validate({ sub: 'user-uuid', email: 'john@example.com' });

      expect(usersService.findById).toHaveBeenCalledWith('user-uuid');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockRejectedValue(new UnauthorizedException());

      await expect(
        strategy.validate({ sub: 'unknown-uuid', email: 'unknown@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findById.mockResolvedValue(inactiveUser);

      await expect(
        strategy.validate({ sub: 'user-uuid', email: 'john@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is null', async () => {
      usersService.findById.mockResolvedValue(null as any);

      await expect(
        strategy.validate({ sub: 'user-uuid', email: 'john@example.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
