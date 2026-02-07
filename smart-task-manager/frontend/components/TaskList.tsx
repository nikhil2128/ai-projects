
'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function TaskList({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    api(`/tasks/project/${projectId}`).then(setTasks);
  }, [projectId]);

  return (
    <ul>
      {tasks.map(t => (
        <li key={t.id}>
          <input type="checkbox" checked={t.completed} readOnly /> {t.title}
        </li>
      ))}
    </ul>
  );
}
