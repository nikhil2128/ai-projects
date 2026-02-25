import { Server } from "http";

export function setupGracefulShutdown(
  server: Server,
  serviceName: string,
  cleanupFn?: () => Promise<void>
): void {
  let isShuttingDown = false;

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[${serviceName}] Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      try {
        if (cleanupFn) await cleanupFn();
        console.log(`[${serviceName}] Cleanup complete, exiting`);
        process.exit(0);
      } catch (err) {
        console.error(`[${serviceName}] Cleanup error:`, err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error(`[${serviceName}] Forced shutdown after timeout`);
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
