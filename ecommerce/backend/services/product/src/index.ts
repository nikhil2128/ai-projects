import { createApp } from "./app";
import { setupGracefulShutdown } from "../../../shared/graceful-shutdown";

const PORT = process.env.PORT ?? 3002;

const { app } = createApp();

const server = app.listen(PORT, () => {
  console.log(`Product service running on http://localhost:${PORT}`);
});

setupGracefulShutdown(server, "product");
