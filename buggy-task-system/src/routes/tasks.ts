
import { Router } from 'express';
import { createTask } from '../db/database';
import { reassignTask } from '../services/taskService';

const router = Router();

router.post('/', (req, res) => {
  const task = createTask(req.body.title);
  res.json(task);
});

router.post('/:id/reassign', async (req, res) => {
  try {
    const task = await reassignTask(req.params.id, req.body.userId);
    res.json(task);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
