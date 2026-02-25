import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TTLCache } from "./cache";

describe("TTLCache", () => {
  let cache: TTLCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new TTLCache<string>(1000);
  });

  afterEach(() => {
    cache.destroy();
    vi.useRealTimers();
  });

  it("should store and retrieve values", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("should return undefined for missing keys", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("should expire entries after TTL", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(1001);
    expect(cache.get("key1")).toBeUndefined();
  });

  it("should support custom TTL per entry", () => {
    cache.set("short", "val", 500);
    cache.set("long", "val", 2000);

    vi.advanceTimersByTime(600);
    expect(cache.get("short")).toBeUndefined();
    expect(cache.get("long")).toBe("val");
  });

  it("should delete entries", () => {
    cache.set("key1", "value1");
    cache.delete("key1");
    expect(cache.get("key1")).toBeUndefined();
  });

  it("should invalidate by pattern prefix", () => {
    cache.set("product:1", "a");
    cache.set("product:2", "b");
    cache.set("user:1", "c");

    cache.invalidatePattern("product:");
    expect(cache.get("product:1")).toBeUndefined();
    expect(cache.get("product:2")).toBeUndefined();
    expect(cache.get("user:1")).toBe("c");
  });

  it("should clear all entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  it("should report correct size", () => {
    expect(cache.size).toBe(0);
    cache.set("a", "1");
    cache.set("b", "2");
    expect(cache.size).toBe(2);
  });

  it("should cleanup expired entries on interval", () => {
    cache.set("a", "1", 500);
    cache.set("b", "2", 120_000);

    vi.advanceTimersByTime(60_001);
    expect(cache.size).toBe(1);
    expect(cache.get("b")).toBe("2");
  });

  it("should overwrite existing keys", () => {
    cache.set("key", "old");
    cache.set("key", "new");
    expect(cache.get("key")).toBe("new");
  });

  it("should use default TTL from constructor", () => {
    const shortCache = new TTLCache<number>(200);
    shortCache.set("x", 42);
    expect(shortCache.get("x")).toBe(42);

    vi.advanceTimersByTime(201);
    expect(shortCache.get("x")).toBeUndefined();
    shortCache.destroy();
  });

  it("should stop cleanup on destroy", () => {
    cache.set("a", "1");
    cache.destroy();
    expect(cache.size).toBe(0);
  });
});
