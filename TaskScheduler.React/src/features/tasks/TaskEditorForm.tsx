import { useState, type ComponentProps } from 'react'
import Button from 'devextreme-react/button'
import DxForm, { GroupItem, Label, SimpleItem } from 'devextreme-react/form'
import notify from 'devextreme/ui/notify'
import 'devextreme/ui/text_box'
import 'devextreme/ui/text_area'
import 'devextreme/ui/switch'
import { createEntity, updateEntity } from '../../api/adminApi'
import type { TaskSummary } from '../../types/entities'

type TaskEditorFormProps = {
  task: TaskSummary | null
  onCancel: () => void
  onSaved: (task: TaskSummary) => void
}

type TaskDraft = Pick<TaskSummary, 'Id' | 'IsActive' | 'Name' | 'Description'>

type FormFieldChangeEvent = Parameters<NonNullable<ComponentProps<typeof DxForm>['onFieldDataChanged']>>[0]

function createTaskDraft(task: TaskSummary | null): TaskDraft {
  return {
    Id: task?.Id ?? 0,
    IsActive: task?.IsActive ?? true,
    Name: task?.Name ?? '',
    Description: task?.Description ?? '',
  }
}

export function TaskEditorForm({ task, onCancel, onSaved }: TaskEditorFormProps) {
  const [formData, setFormData] = useState<TaskDraft>(() => createTaskDraft(task))
  const isEdit = formData.Id > 0

  function handleFieldChange(event: FormFieldChangeEvent) {
    switch (event.dataField) {
      case 'Name':
        setFormData((currentData) => ({ ...currentData, Name: String(event.value ?? '') }))
        break
      case 'Description':
        setFormData((currentData) => ({ ...currentData, Description: String(event.value ?? '') }))
        break
      case 'IsActive':
        setFormData((currentData) => ({ ...currentData, IsActive: Boolean(event.value) }))
        break
      default:
        break
    }
  }

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

  return (
    <section className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <p className="workspace-view__eyebrow">Task Editor</p>
          <h2>{isEdit ? `Edit ${formData.Name || 'Task'}` : 'Create Task'}</h2>
        </div>
        <div className="workspace-view__actions">
          <Button text="Back" stylingMode="outlined" onClick={onCancel} />
          <Button text="Save Task" type="default" onClick={saveTask} />
        </div>
      </div>

      <div className="workspace-card">
        <DxForm formData={formData} colCount={2} labelLocation="top" onFieldDataChanged={handleFieldChange}>
          <GroupItem colCount={2} caption="Task Details">
            <SimpleItem dataField="Name" isRequired colSpan={2}>
              <Label text="Task Name" />
            </SimpleItem>
            <SimpleItem dataField="IsActive" editorType="dxSwitch">
              <Label text="Enabled" />
            </SimpleItem>
            <SimpleItem dataField="Description" editorType="dxTextArea" colSpan={2} editorOptions={{ minHeight: 140 }}>
              <Label text="Description" />
            </SimpleItem>
          </GroupItem>
        </DxForm>
      </div>
    </section>
  )
}