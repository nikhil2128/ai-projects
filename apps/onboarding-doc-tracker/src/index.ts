import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.warn(`Onboarding Doc Tracker running on port ${config.port}`);
  console.warn(`Health: http://localhost:${config.port}/health`);
  console.warn(`Manual trigger: POST http://localhost:${config.port}/trigger`);
});

export default app;
