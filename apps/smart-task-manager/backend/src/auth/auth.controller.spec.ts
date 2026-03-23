import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

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

  const mockAuthResponse = {
    user: {
      id: 'user-uuid-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: Role.USER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    accessToken: 'jwt-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            getProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and return auth response', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const dto = {
        email: 'john@example.com',
        password: 'StrongP@ss1',
        firstName: 'John',
        lastName: 'Doe',
      };

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    it('should login and return auth response', async () => {
      authService.login.mockResolvedValue(mockAuthResponse);

      const dto = {
        email: 'john@example.com',
        password: 'StrongP@ss1',
      };

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const profileResult = {
        id: 'user-uuid-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      authService.getProfile.mockResolvedValue(profileResult);

      const result = await controller.getProfile(mockUser);

      expect(authService.getProfile).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual(profileResult);
    });
  });
});
