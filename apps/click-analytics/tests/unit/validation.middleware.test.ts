import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validateBody } from "../../src/middleware/validation";

describe("validateBody middleware", () => {
  it("passes parsed body to next for valid payload", () => {
    const middleware = validateBody(
      z.object({
        name: z.string().min(1),
      })
    );
    const req = { body: { name: "test" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ name: "test" });
  });

  it("returns 400 for invalid payload", () => {
    const middleware = validateBody(
      z.object({
        name: z.string().min(3),
      })
    );
    const req = { body: { name: "x" } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation failed",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
