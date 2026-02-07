
import { TaskList } from '../../../components/TaskList';

export default function Page({ params }: any) {
  return (
    <div>
      <h1>Project</h1>
      <TaskList projectId={params.id} />
    </div>
  );
}
