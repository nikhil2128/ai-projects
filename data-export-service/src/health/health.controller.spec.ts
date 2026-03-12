import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockImplementation((indicators) => {
              return Promise.resolve({
                status: 'ok',
                details: { database: { status: 'up' } },
              });
            }),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check result', async () => {
      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalledWith([expect.any(Function)]);
      expect(result).toEqual({
        status: 'ok',
        details: { database: { status: 'up' } },
      });
    });

    it('should call database ping check via the indicator callback', async () => {
      const mockPingCheck = jest.fn().mockResolvedValue({ database: { status: 'up' } });
      const mockCheck = jest.fn().mockImplementation(async (indicators) => {
        await indicators[0]();
        return { status: 'ok' };
      });

      const module: TestingModule = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [
          { provide: HealthCheckService, useValue: { check: mockCheck } },
          { provide: TypeOrmHealthIndicator, useValue: { pingCheck: mockPingCheck } },
        ],
      }).compile();

      const ctrl = module.get<HealthController>(HealthController);
      await ctrl.check();

      expect(mockPingCheck).toHaveBeenCalledWith('database');
    });
  });
});
