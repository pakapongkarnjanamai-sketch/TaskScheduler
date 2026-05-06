import { useNavigate } from 'react-router-dom'
import { TaskEditorForm } from './TaskEditorForm'
import { taskPaths } from './taskRoutes'

export function TaskCreatePage() {
  const navigate = useNavigate()

  return (
    <section className="shell-page shell-page--narrow">
      <TaskEditorForm
        task={null}
        onCancel={() => navigate(taskPaths.catalog)}
        onSaved={(task) => navigate(taskPaths.overview(task.Id), { replace: true })}
      />
    </section>
  )
}