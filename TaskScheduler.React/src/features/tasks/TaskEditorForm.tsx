import { useId, useState } from 'react'
import notify from 'devextreme/ui/notify'
import { createEntity, updateEntity } from '../../api/adminApi'
import type { TaskSummary } from '../../types/entities'

type TaskEditorFormProps = {
  task: TaskSummary | null
  onCancel: () => void
  onSaved: (task: TaskSummary) => void
}

type TaskDraft = Pick<TaskSummary, 'Id' | 'IsActive' | 'Name' | 'Description'>

function createTaskDraft(task: TaskSummary | null): TaskDraft {
  return {
    Id: task?.Id ?? 0,
    IsActive: task?.IsActive ?? true,
    Name: task?.Name ?? '',
    Description: task?.Description ?? '',
  }
}

export function TaskEditorForm({ task, onSaved }: TaskEditorFormProps) {
  const [formData, setFormData] = useState<TaskDraft>(() => createTaskDraft(task))
  const fieldId = useId()
  const isEdit = formData.Id > 0
  const formId = 'task-editor-form'

  async function saveTask() {
    const name = formData.Name.trim()
    if (!name) {
      notify('Task name is required.', 'error', 3000)
      return
    }

    const payload = {
      Name: name,
      Description: formData.Description?.trim() || null,
      IsActive: formData.IsActive,
    }

    try {
      const result = isEdit
        ? (await updateEntity('Tasks', formData.Id, payload) as TaskSummary | undefined)
        : (await createEntity('Tasks', payload) as TaskSummary | undefined)

      notify('Task saved.', 'success', 2000)
      onSaved(result ?? { ...formData, ...payload })
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to save task.', 'error', 4000)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveTask()
  }

  return (
    <section className="workspace-view">
      <form id={formId} className="editor-form editor-form--task" onSubmit={handleSubmit}>

        <section className="workspace-card editor-form__section editor-form__section--identity">
          <div className="editor-form__section-header">
            <div className="editor-form__section-title-block">
              <h2>Task Details</h2>
              <p>Set the task name first, then add any operating notes.</p>
            </div>
            <label className="editor-toggle" htmlFor={`${fieldId}-active`}>
              <input
                id={`${fieldId}-active`}
                type="checkbox"
                checked={formData.IsActive}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, IsActive: event.target.checked }))
                }}
              />
              <span>Enabled</span>
            </label>
          </div>

          <div className="editor-form__grid editor-form__grid--single-column">
            <div className="editor-field editor-field--required">
              <label className="editor-field__label" htmlFor={`${fieldId}-name`}>
                Task Name
              </label>
              <input
                id={`${fieldId}-name`}
                className="editor-field__control"
                type="text"
                value={formData.Name}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, Name: event.target.value }))
                }}
                autoComplete="off"
              />
            </div>

            <div className="editor-field">
              <label className="editor-field__label" htmlFor={`${fieldId}-description`}>
                Description
              </label>
              <textarea
                id={`${fieldId}-description`}
                className="editor-field__control editor-field__control--multiline"
                value={formData.Description ?? ''}
                onChange={(event) => {
                  setFormData((currentData) => ({ ...currentData, Description: event.target.value }))
                }}
                rows={8}
              />
            </div>
          </div>
        </section>
      </form>
    </section>
  )
}