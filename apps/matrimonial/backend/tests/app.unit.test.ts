import { mockStore, resetMockStore } from './helpers/storeMock';

describe('app scheduling', () => {
  beforeEach(() => {
    vi.resetModules();
    resetMockStore();
  });

  it('schedules daily recommendation refreshes in UTC', async () => {
    const task = { stop: vi.fn() };
    let scheduledCallback: (() => Promise<void>) | undefined;
    const scheduleMock = vi.fn((pattern: string, callback: () => Promise<void>, options: unknown) => {
      scheduledCallback = callback;
      return task;
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    vi.doMock('node-cron', () => ({
      schedule: scheduleMock,
    }));
    vi.doMock('../src/data/store.js', () => ({
      store: mockStore,
    }));

    mockStore.refreshRecommendationsForActiveUsers.mockResolvedValue(undefined);

    const { scheduleRecommendationRefresh } = await import('../src/app.js');
    const createdTask = scheduleRecommendationRefresh();

    expect(createdTask).toBe(task);
    expect(scheduleMock).toHaveBeenCalledWith('0 0 * * *', expect.any(Function), { timezone: 'UTC' });

    await scheduledCallback?.();

    expect(mockStore.refreshRecommendationsForActiveUsers).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Running daily recommendation refresh...');
    expect(logSpy).toHaveBeenCalledWith('Daily recommendation refresh completed.');

    logSpy.mockRestore();
  });

  it('logs refresh failures without throwing', async () => {
    let scheduledCallback: (() => Promise<void>) | undefined;
    const scheduleMock = vi.fn((_pattern: string, callback: () => Promise<void>) => {
      scheduledCallback = callback;
      return { stop: vi.fn() };
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('db unavailable');

    vi.doMock('node-cron', () => ({
      schedule: scheduleMock,
    }));
    vi.doMock('../src/data/store.js', () => ({
      store: mockStore,
    }));

    mockStore.refreshRecommendationsForActiveUsers.mockRejectedValue(failure);

    const { scheduleRecommendationRefresh } = await import('../src/app.js');
    scheduleRecommendationRefresh();

    await scheduledCallback?.();

    expect(errorSpy).toHaveBeenCalledWith('Failed to refresh recommendations', failure);

    errorSpy.mockRestore();
  });
});
