
import { db, Task } from '../db/database';

/**
 * INTENTIONAL BUG:
 * Race condition due to missing transactional boundaries.
 */
export async function reassignTask(taskId: string, userId: string): Promise<Task> {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) throw new Error('Task not found');

  await new Promise(res => setTimeout(res, Math.random() * 50));

  task.assignedTo = undefined;

  await new Promise(res => setTimeout(res, Math.random() * 50));

  task.assignedTo = userId;

  return task;
}
