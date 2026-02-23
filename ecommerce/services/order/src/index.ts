import { createApp } from "./app";

const PORT = process.env.PORT ?? 3004;

const { app } = createApp();

app.listen(PORT, () => {
  console.log(`Order service running on http://localhost:${PORT}`);
});
