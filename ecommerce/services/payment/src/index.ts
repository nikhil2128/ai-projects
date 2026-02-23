import { createApp } from "./app";

const PORT = process.env.PORT ?? 3005;

const { app } = createApp();

app.listen(PORT, () => {
  console.log(`Payment service running on http://localhost:${PORT}`);
});
