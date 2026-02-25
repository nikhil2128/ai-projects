import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";

const PORT = process.env.PORT ?? 3003;

const { app } = createApp();

const server = app.listen(PORT, () => {
  console.log(`Cart service running on http://localhost:${PORT}`);
});

setupGracefulShutdown(server, "cart");
