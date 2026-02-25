import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";

const PORT = process.env.PORT ?? 3004;

const { app } = createApp();

const server = app.listen(PORT, () => {
  console.log(`Order service running on http://localhost:${PORT}`);
});

setupGracefulShutdown(server, "order");
