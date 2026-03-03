import Redis from "ioredis";
import { config } from "../config";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) return redis;

  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // required for blocking commands (XREADGROUP BLOCK)
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 200, 5_000);
    },
  });

  redis.on("error", (err) => {
    console.error("[REDIS]", err.message);
  });

  redis.on("ready", () => {
    console.log("[REDIS] Connected");
  });

  return redis;
}

export async function waitForRedis(): Promise<void> {
  const r = getRedis();
  if (r.status === "ready") return;

  return new Promise<void>((resolve, reject) => {
    const onReady = () => {
      r.removeListener("error", onError);
      resolve();
    };
    const onError = (err: Error) => {
      r.removeListener("ready", onReady);
      reject(err);
    };
    r.once("ready", onReady);
    r.once("error", onError);
  });
}

export async function isRedisHealthy(): Promise<boolean> {
  try {
    if (!redis || redis.status !== "ready") return false;
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}
