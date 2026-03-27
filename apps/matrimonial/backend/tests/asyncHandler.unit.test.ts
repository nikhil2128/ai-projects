import type { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../src/utils/asyncHandler.js';

describe('asyncHandler', () => {
  it('passes successful handlers through without calling next', async () => {
    const next = vi.fn() as NextFunction;
    const handler = asyncHandler(async () => {});

    handler({} as Request, {} as Response, next);
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
  });

  it('forwards rejected promises to next', async () => {
    const error = new Error('boom');
    const next = vi.fn() as NextFunction;
    const handler = asyncHandler(async () => {
      throw error;
    });

    handler({} as Request, {} as Response, next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledWith(error);
  });
});
