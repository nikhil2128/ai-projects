import { describe, it, expect, beforeEach, vi } from "vitest";
import { CircuitBreaker } from "./circuit-breaker";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    breaker = new CircuitBreaker("test", {
      failureThreshold: 3,
      resetTimeout: 5000,
      halfOpenMaxCalls: 2,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start in closed state", () => {
    expect(breaker.getState()).toBe("closed");
  });

  it("should execute successfully in closed state", async () => {
    const result = await breaker.execute(async () => "success");
    expect(result).toBe("success");
    expect(breaker.getState()).toBe("closed");
  });

  it("should stay closed below failure threshold", async () => {
    const fail = () => breaker.execute(async () => { throw new Error("fail"); });

    await expect(fail()).rejects.toThrow("fail");
    await expect(fail()).rejects.toThrow("fail");
    expect(breaker.getState()).toBe("closed");
  });

  it("should open after reaching failure threshold", async () => {
    const fail = () => breaker.execute(async () => { throw new Error("fail"); });

    await expect(fail()).rejects.toThrow();
    await expect(fail()).rejects.toThrow();
    await expect(fail()).rejects.toThrow();

    expect(breaker.getState()).toBe("open");
  });

  it("should reject calls when open", async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
    }

    await expect(
      breaker.execute(async () => "should not run")
    ).rejects.toThrow('Circuit breaker "test" is open');
  });

  it("should transition to half-open after reset timeout", async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
    }
    expect(breaker.getState()).toBe("open");

    vi.advanceTimersByTime(5001);
    const result = await breaker.execute(async () => "recovered");
    expect(result).toBe("recovered");
    expect(breaker.getState()).toBe("closed");
  });

  it("should limit concurrent calls in half-open state", async () => {
    const limBreaker = new CircuitBreaker("limit-test", {
      failureThreshold: 3,
      resetTimeout: 5000,
      halfOpenMaxCalls: 2,
    });

    for (let i = 0; i < 3; i++) {
      await limBreaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
    }
    expect(limBreaker.getState()).toBe("open");

    vi.advanceTimersByTime(5001);

    let resolve1!: () => void;
    let resolve2!: () => void;
    const p1 = new Promise<string>((r) => { resolve1 = () => r("ok1"); });
    const p2 = new Promise<string>((r) => { resolve2 = () => r("ok2"); });

    const call1 = limBreaker.execute(() => p1);
    const call2 = limBreaker.execute(() => p2);

    await expect(
      limBreaker.execute(async () => "blocked")
    ).rejects.toThrow("half-open limit reached");

    resolve1();
    resolve2();
    await call1;
    await call2;
  });

  it("should close circuit on success in half-open state", async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
    }

    vi.advanceTimersByTime(5001);
    await breaker.execute(async () => "ok");
    expect(breaker.getState()).toBe("closed");

    const result = await breaker.execute(async () => "works again");
    expect(result).toBe("works again");
  });

  it("should re-open circuit on failure in half-open state reaching threshold", async () => {
    for (let i = 0; i < 3; i++) {
      await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
    }

    vi.advanceTimersByTime(5001);

    for (let i = 0; i < 3; i++) {
      await breaker.execute(async () => { throw new Error("fail again"); }).catch(() => {});
    }

    expect(breaker.getState()).toBe("open");
  });

  it("should reset failure count on success", async () => {
    await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
    await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});

    await breaker.execute(async () => "ok");

    await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});
    await breaker.execute(async () => { throw new Error("fail"); }).catch(() => {});

    expect(breaker.getState()).toBe("closed");
  });

  it("should use default options when none provided", () => {
    const defaultBreaker = new CircuitBreaker("default");
    expect(defaultBreaker.getState()).toBe("closed");
  });
});
