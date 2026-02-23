import { createApp } from "./app";

const PORT = process.env.PORT ?? 3000;

const { app } = createApp();

app.listen(PORT, () => {
  console.log(`E-commerce server running on http://localhost:${PORT}`);
});
