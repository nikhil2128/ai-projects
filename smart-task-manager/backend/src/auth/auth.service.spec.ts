import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'john@example.com',
    password: 'hashed-password',
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
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmail: jest.fn(),
            findById: jest.fn(),
            validatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and return auth response', async () => {
      usersService.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register({
        email: 'john@example.com',
        password: 'StrongP@ss1',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        'john@example.com',
        'StrongP@ss1',
        'John',
        'Doe',
        undefined,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-uuid-1',
        email: 'john@example.com',
        role: Role.USER,
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'jwt-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should register a user with a specified role', async () => {
      usersService.create.mockResolvedValue({ ...mockUser, role: Role.ADMIN });
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register({
        email: 'john@example.com',
        password: 'StrongP@ss1',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.ADMIN,
      });

      expect(usersService.create).toHaveBeenCalledWith(
        'john@example.com',
        'StrongP@ss1',
        'John',
        'Doe',
        Role.ADMIN,
      );
      expect(result.accessToken).toBe('jwt-token');
    });
  });

  describe('login', () => {
    it('should login successfully and return auth response', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login({
        email: 'john@example.com',
        password: 'StrongP@ss1',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(usersService.validatePassword).toHaveBeenCalledWith(mockUser, 'StrongP@ss1');
      expect(result).toHaveProperty('accessToken', 'jwt-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'john@example.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when account is deactivated', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersService.findByEmail.mockResolvedValue(inactiveUser);
      usersService.validatePassword.mockResolvedValue(true);

      await expect(
        service.login({ email: 'john@example.com', password: 'StrongP@ss1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-uuid-1');

      expect(usersService.findById).toHaveBeenCalledWith('user-uuid-1');
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('email', 'john@example.com');
      expect(result).toHaveProperty('firstName', 'John');
    });
  });
});
