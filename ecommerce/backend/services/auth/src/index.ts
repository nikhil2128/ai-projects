import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";

const PORT = process.env.PORT ?? 3001;

const { app } = createApp();

const server = app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
});

setupGracefulShutdown(server, "auth");
