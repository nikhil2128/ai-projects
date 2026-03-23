
import express from 'express';
import taskRoutes from './routes/tasks';

const app = express();
app.use(express.json());

app.use('/tasks', taskRoutes);

app.listen(3000, () => {
  console.log('Buggy Task System running on http://localhost:3000');
});
