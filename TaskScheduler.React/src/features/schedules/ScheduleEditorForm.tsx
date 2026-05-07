import { useId, useState } from 'react'
import notify from 'devextreme/ui/notify'
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
  onCancel: () => void
  onSaved: () => void
}

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

export function ScheduleEditorForm({ task, schedule, onSaved }: ScheduleEditorFormProps) {
  const [formData, setFormData] = useState<Schedule>(() => normalizeSchedule(task.Id, schedule))
  const fieldId = useId()
  const isEdit = formData.Id > 0
  const rule = getTriggerRule(formData.TriggerType)
  const selectedDays = parseDaysOfWeek(formData.DaysOfWeek)

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveSchedule()
  }

  function handleTriggerTypeChange(triggerType: ScheduleTriggerType) {
    setFormData((currentData) => applyTriggerDefaults(currentData, triggerType))
  }

  function toggleWeekDay(day: string, isSelected: boolean) {
    setFormData((currentData) => {
      const currentDays = parseDaysOfWeek(currentData.DaysOfWeek)
      const nextDays = isSelected
        ? Array.from(new Set([...currentDays, day]))
        : currentDays.filter((currentDay) => currentDay !== day)

      return {
        ...currentData,
        DaysOfWeek: nextDays,
      }
    })
  }

  return (
    <section className="workspace-view">
      <form className="editor-form editor-form--wide" onSubmit={handleSubmit}>
        <div className="workspace-view__header workspace-view__header--actions-only">
          <div className="workspace-view__actions">
            <button type="submit" className="row-action row-action--primary">
              Save Schedule
            </button>
          </div>
        </div>

        <section className="workspace-card editor-form__section editor-form__section--identity">
          <div className="editor-form__section-header">
            <div className="editor-form__section-title-block">
              <h2>Schedule Details</h2>
              <p>Name the schedule, choose the pattern, then define only the timing fields that apply.</p>
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

          <div className="editor-form__grid editor-form__grid--details">
            <div className="editor-field editor-field--required editor-field--span-2">
              <label className="editor-field__label" htmlFor={`${fieldId}-name`}>
                Schedule
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
              <label className="editor-field__label" htmlFor={`${fieldId}-pattern`}>
                Pattern
              </label>
              <select
                id={`${fieldId}-pattern`}
                className="editor-field__control"
                value={formData.TriggerType}
                onChange={(event) => {
                  handleTriggerTypeChange(event.target.value as ScheduleTriggerType)
                }}
              >
                {scheduleTriggerTypes.map((triggerType) => (
                  <option key={triggerType} value={triggerType}>
                    {triggerType}
                  </option>
                ))}
              </select>
            </div>

            <div className="editor-field">
              <label className="editor-field__label" htmlFor={`${fieldId}-start-time`}>
                Run at
              </label>
              <input
                id={`${fieldId}-start-time`}
                className="editor-field__control"
                type="time"
                value={formData.StartTime ?? ''}
                onChange={(event) => {
                  setFormData((currentData) => ({
                    ...currentData,
                    StartTime: normalizeTime(event.target.value),
                  }))
                }}
                step={1}
                disabled={!rule.usesStartTime}
              />
            </div>

            <div className="editor-field editor-field--span-2">
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
                rows={6}
              />
            </div>
          </div>
        </section>

        <section className="workspace-card editor-form__section">
          <div className="editor-form__section-header">
            <div className="editor-form__section-title-block">
              <h2>Timing</h2>
              <p>Only the fields that matter for the selected pattern stay active.</p>
            </div>
          </div>

          <div className="editor-form__grid editor-form__grid--timing">
            {rule.usesIntervalTime && (
              <div className="editor-field">
                <label className="editor-field__label" htmlFor={`${fieldId}-interval`}>
                  Every (minutes)
                </label>
                <input
                  id={`${fieldId}-interval`}
                  className="editor-field__control"
                  type="number"
                  min={1}
                  value={formData.IntervalTime ?? ''}
                  onChange={(event) => {
                    const nextValue = event.target.valueAsNumber
                    setFormData((currentData) => ({
                      ...currentData,
                      IntervalTime: Number.isNaN(nextValue) ? null : nextValue,
                    }))
                  }}
                />
              </div>
            )}

            {rule.usesDayOfMonth && (
              <div className="editor-field">
                <label className="editor-field__label" htmlFor={`${fieldId}-day-of-month`}>
                  Day of month
                </label>
                <input
                  id={`${fieldId}-day-of-month`}
                  className="editor-field__control"
                  type="number"
                  min={1}
                  max={31}
                  value={formData.DayOfMonth ?? ''}
                  onChange={(event) => {
                    const nextValue = event.target.valueAsNumber
                    setFormData((currentData) => ({
                      ...currentData,
                      DayOfMonth: Number.isNaN(nextValue) ? null : nextValue,
                    }))
                  }}
                />
              </div>
            )}
          </div>

          {rule.usesDaysOfWeek && (
            <fieldset className="editor-fieldset">
              <legend className="editor-field__label">Weekdays</legend>
              <div className="editor-choice-grid">
                {weekDayOptions.map((option) => {
                  const isSelected = selectedDays.includes(option.value)

                  return (
                    <label key={option.value} className="editor-choice" htmlFor={`${fieldId}-${option.value}`}>
                      <input
                        id={`${fieldId}-${option.value}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) => {
                          toggleWeekDay(option.value, event.target.checked)
                        }}
                      />
                      <span>{option.text}</span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}
        </section>
      </form>
    </section>
  )
}