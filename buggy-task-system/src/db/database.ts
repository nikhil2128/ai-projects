
import { v4 as uuid } from 'uuid';

export type Task = {
  id: string;
  title: string;
  assignedTo?: string;
};

export const db = {
  tasks: [] as Task[],
};

export function createTask(title: string): Task {
  const task = { id: uuid(), title };
  db.tasks.push(task);
  return task;
}
