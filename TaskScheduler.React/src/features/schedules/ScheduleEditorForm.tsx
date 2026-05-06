import { useState, type ComponentProps, type ReactNode } from 'react'
import DxForm, { GroupItem, Label, SimpleItem } from 'devextreme-react/form'
import notify from 'devextreme/ui/notify'
import 'devextreme/ui/text_box'
import 'devextreme/ui/text_area'
import 'devextreme/ui/select_box'
import 'devextreme/ui/number_box'
import 'devextreme/ui/switch'
import 'devextreme/ui/tag_box'
import { createEntity, updateEntity } from '../../api/adminApi'
import type { Schedule, ScheduleTriggerType, TaskSummary } from '../../types/entities'
import {
  applyTriggerDefaults,
  createScheduleDefaults,
  getTriggerRule,
  normalizeTime,
  parseDaysOfWeek,
  scheduleTriggerTypes,
  toSchedulePayload,
  validateSchedule,
  weekDayOptions,
} from './scheduleRules'

type ScheduleEditorFormProps = {
  task: TaskSummary
  schedule: Schedule | null
  breadcrumb?: ReactNode
  onCancel: () => void
  onSaved: () => void
}

type FormFieldChangeEvent = Parameters<NonNullable<ComponentProps<typeof DxForm>['onFieldDataChanged']>>[0]

function normalizeSchedule(taskId: number, schedule: Schedule | null): Schedule {
  if (!schedule) {
    return createScheduleDefaults(taskId)
  }

  return {
    ...schedule,
    TaskId: taskId,
    DaysOfWeek: parseDaysOfWeek(schedule.DaysOfWeek),
    StartTime: normalizeTime(schedule.StartTime),
  }
}

export function ScheduleEditorForm({ task, schedule, breadcrumb, onSaved }: ScheduleEditorFormProps) {
  const [formData, setFormData] = useState<Schedule>(() => normalizeSchedule(task.Id, schedule))
  const isEdit = formData.Id > 0
  const rule = getTriggerRule(formData.TriggerType)

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
      case 'TriggerType':
        setFormData((currentData) => applyTriggerDefaults(currentData, event.value as ScheduleTriggerType))
        break
      case 'IntervalTime':
        setFormData((currentData) => ({ ...currentData, IntervalTime: Number(event.value ?? 0) }))
        break
      case 'StartTime':
        setFormData((currentData) => ({
          ...currentData,
          StartTime: normalizeTime(String(event.value ?? '').trim()),
        }))
        break
      case 'DaysOfWeek':
        setFormData((currentData) => ({
          ...currentData,
          DaysOfWeek: Array.isArray(event.value) ? event.value as string[] : parseDaysOfWeek(String(event.value ?? '')),
        }))
        break
      case 'DayOfMonth':
        setFormData((currentData) => ({ ...currentData, DayOfMonth: Number(event.value ?? 0) }))
        break
      default:
        break
    }
  }

  async function saveSchedule() {
    const validationError = validateSchedule(formData)
    if (validationError) {
      notify(validationError, 'error', 3500)
      return
    }

    try {
      const payload = toSchedulePayload(formData)
      if (isEdit && schedule) {
        await updateEntity('Schedules', schedule.Id, payload)
      } else {
        await createEntity('Schedules', payload)
      }

      notify('Schedule saved.', 'success', 2000)
      onSaved()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to save schedule.', 'error', 4000)
    }
  }

  return (
    <section className="workspace-view">
      <div className="workspace-view__header workspace-view__header--actions-only">
        {breadcrumb ? <div>{breadcrumb}</div> : <div />}
        <div className="workspace-view__actions">
          <button type="button" className="row-action row-action--primary" onClick={() => void saveSchedule()}>
            Save Schedule
          </button>
        </div>
      </div>

      <div className="workspace-card">
        <DxForm formData={formData} colCount={2} labelLocation="top" onFieldDataChanged={handleFieldChange}>
          <GroupItem caption="Schedule Details" colCount={2}>
            <SimpleItem dataField="Name" isRequired colSpan={2}>
              <Label text="Schedule" />
            </SimpleItem>
            <SimpleItem dataField="IsActive" editorType="dxSwitch">
              <Label text="Enabled" />
            </SimpleItem>
            <SimpleItem
              dataField="TriggerType"
              editorType="dxSelectBox"
              editorOptions={{ items: scheduleTriggerTypes }}
            >
              <Label text="Pattern" />
            </SimpleItem>
            <SimpleItem dataField="Description" editorType="dxTextArea" colSpan={2} editorOptions={{ minHeight: 140 }}>
              <Label text="Description" />
            </SimpleItem>
          </GroupItem>
          <GroupItem caption="Timing" colCount={2}>
            {rule.usesIntervalTime && (
              <SimpleItem dataField="IntervalTime" editorType="dxNumberBox" editorOptions={{ min: 1, showSpinButtons: true }}>
                <Label text="Every (minutes)" />
              </SimpleItem>
            )}
            {rule.usesStartTime && (
              <SimpleItem dataField="StartTime" editorType="dxTextBox" editorOptions={{ placeholder: '08:00:00' }}>
                <Label text="Run at" />
              </SimpleItem>
            )}
            {rule.usesDaysOfWeek && (
              <SimpleItem
                dataField="DaysOfWeek"
                colSpan={2}
                editorType="dxTagBox"
                editorOptions={{
                  dataSource: weekDayOptions,
                  valueExpr: 'value',
                  displayExpr: 'text',
                  showSelectionControls: true,
                  multiline: false,
                  hideSelectedItems: false,
                }}
              >
                <Label text="Weekdays" />
              </SimpleItem>
            )}
            {rule.usesDayOfMonth && (
              <SimpleItem dataField="DayOfMonth" editorType="dxNumberBox" editorOptions={{ min: 1, max: 31, showSpinButtons: true }}>
                <Label text="Day of month" />
              </SimpleItem>
            )}
          </GroupItem>
        </DxForm>
      </div>
    </section>
  )
}