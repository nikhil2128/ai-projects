import { createApp } from "./app";

const PORT = process.env.PORT ?? 3003;

const { app } = createApp();

app.listen(PORT, () => {
  console.log(`Cart service running on http://localhost:${PORT}`);
});
