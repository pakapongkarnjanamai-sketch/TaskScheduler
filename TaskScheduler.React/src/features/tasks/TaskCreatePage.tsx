import { useId, useState } from 'react'
import notify from 'devextreme/ui/notify'
import { useNavigate } from 'react-router-dom'
import { createEntity } from '../../api/adminApi'
import type { Schedule, ScheduleTriggerType, Step, TaskSummary } from '../../types/entities'
import {
  applyTriggerDefaults,
  buildScheduleSummary,
  createScheduleDefaults,
  normalizeTime,
  parseDaysOfWeek,
  scheduleTriggerTypes,
  toSchedulePayload,
  validateSchedule,
  weekDayOptions,
} from '../schedules/scheduleRules'
import { TaskLayoutShell } from './TaskLayoutShell'
import { taskPaths } from './taskRoutes'

type WizardStepKey = 'task' | 'steps' | 'schedules' | 'review'

type TaskDraft = {
  Name: string
  Description: string
  IsActive: boolean
}

type StepDraft = Step & {
  LocalId: string
}

type ScheduleDraft = Schedule & {
  LocalId: string
}

const wizardSteps: Array<{ key: WizardStepKey; label: string }> = [
  { key: 'task', label: 'Task Details' },
  { key: 'steps', label: 'Steps' },
  { key: 'schedules', label: 'Schedules' },
  { key: 'review', label: 'Review' },
]

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

function createLocalId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createTaskDraft(): TaskDraft {
  return {
    Name: '',
    Description: '',
    IsActive: true,
  }
}

function createStepDraft(order: number): StepDraft {
  return {
    LocalId: createLocalId('step'),
    Id: 0,
    TaskId: 0,
    IsActive: true,
    Name: '',
    Description: '',
    Order: order,
    ApiUrl: '',
    HttpMethod: 'GET',
    Headers: '',
    Body: '',
  }
}

function createWizardScheduleDraft(): ScheduleDraft {
  return {
    LocalId: createLocalId('schedule'),
    ...createScheduleDefaults(0),
  }
}

function reindexStepDrafts(stepDrafts: StepDraft[]) {
  return stepDrafts.map((stepDraft, index) => ({
    ...stepDraft,
    Order: index + 1,
  }))
}

function validateTaskDraft(taskDraft: TaskDraft) {
  if (!taskDraft.Name.trim()) {
    return 'Please enter a task name.'
  }

  return null
}

function validateStepDraft(stepDraft: StepDraft, index: number) {
  if (!stepDraft.Name.trim()) {
    return `Step ${index + 1}: Please enter a step name.`
  }

  if (!stepDraft.ApiUrl.trim()) {
    return `Step ${index + 1}: Please enter a URL.`
  }

  return null
}

function validateAllSteps(stepDrafts: StepDraft[]) {
  for (const [index, stepDraft] of stepDrafts.entries()) {
    const validationError = validateStepDraft(stepDraft, index)
    if (validationError) {
      return validationError
    }
  }

  return null
}

function validateAllSchedules(scheduleDrafts: ScheduleDraft[]) {
  for (const [index, scheduleDraft] of scheduleDrafts.entries()) {
    const validationError = validateSchedule(scheduleDraft)
    if (validationError) {
      return `Schedule ${index + 1}: ${validationError}`
    }
  }

  return null
}

function formatOptionalText(value?: string | null) {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : 'Not provided'
}

export function TaskCreatePage() {
  const navigate = useNavigate()
  const fieldId = useId()
  const [currentStep, setCurrentStep] = useState<WizardStepKey>('task')
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0)
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(() => createTaskDraft())
  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([])
  const [scheduleDrafts, setScheduleDrafts] = useState<ScheduleDraft[]>([])
  const [stepsSkipped, setStepsSkipped] = useState(false)
  const [schedulesSkipped, setSchedulesSkipped] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const currentIndex = wizardSteps.findIndex((wizardStep) => wizardStep.key === currentStep)
  const completedSteps = Math.min(currentIndex, wizardSteps.length - 1)

  function goToIndex(nextIndex: number) {
    setCurrentStep(wizardSteps[nextIndex].key)
  }

  function unlockAndGo(nextIndex: number) {
    setHighestUnlockedIndex((currentValue) => Math.max(currentValue, nextIndex))
    goToIndex(nextIndex)
  }

  function addStepDraft() {
    setStepsSkipped(false)
    setStepDrafts((currentDrafts) => [...currentDrafts, createStepDraft(currentDrafts.length + 1)])
  }

  function updateStepDraft(localId: string, updater: (stepDraft: StepDraft) => StepDraft) {
    setStepDrafts((currentDrafts) => currentDrafts.map((stepDraft) => (stepDraft.LocalId === localId ? updater(stepDraft) : stepDraft)))
  }

  function removeStepDraft(localId: string) {
    setStepDrafts((currentDrafts) => reindexStepDrafts(currentDrafts.filter((stepDraft) => stepDraft.LocalId !== localId)))
  }

  function addScheduleDraft() {
    setSchedulesSkipped(false)
    setScheduleDrafts((currentDrafts) => [...currentDrafts, createWizardScheduleDraft()])
  }

  function updateScheduleDraft(localId: string, updater: (scheduleDraft: ScheduleDraft) => ScheduleDraft) {
    setScheduleDrafts((currentDrafts) => currentDrafts.map((scheduleDraft) => (scheduleDraft.LocalId === localId ? updater(scheduleDraft) : scheduleDraft)))
  }

  function removeScheduleDraft(localId: string) {
    setScheduleDrafts((currentDrafts) => currentDrafts.filter((scheduleDraft) => scheduleDraft.LocalId !== localId))
  }

  function handleTaskNext() {
    const validationError = validateTaskDraft(taskDraft)
    if (validationError) {
      notify(validationError, 'error', 3000)
      return
    }

    unlockAndGo(1)
  }

  function handleStepsNext() {
    if (stepDrafts.length === 0) {
      notify('Add a step or choose Skip for now.', 'error', 3000)
      return
    }

    const validationError = validateAllSteps(stepDrafts)
    if (validationError) {
      notify(validationError, 'error', 3500)
      return
    }

    setStepsSkipped(false)
    unlockAndGo(2)
  }

  function handleSchedulesNext() {
    if (scheduleDrafts.length === 0) {
      notify('Add a schedule or choose Skip for now.', 'error', 3000)
      return
    }

    const validationError = validateAllSchedules(scheduleDrafts)
    if (validationError) {
      notify(validationError, 'error', 3500)
      return
    }

    setSchedulesSkipped(false)
    unlockAndGo(3)
  }

  async function handleCreateTask() {
    const taskValidationError = validateTaskDraft(taskDraft)
    if (taskValidationError) {
      notify(taskValidationError, 'error', 3000)
      goToIndex(0)
      return
    }

    const stepValidationError = validateAllSteps(stepDrafts)
    if (stepValidationError) {
      notify(stepValidationError, 'error', 3500)
      goToIndex(1)
      return
    }

    const scheduleValidationError = validateAllSchedules(scheduleDrafts)
    if (scheduleValidationError) {
      notify(scheduleValidationError, 'error', 3500)
      goToIndex(2)
      return
    }

    setIsSubmitting(true)
    let createdTask: TaskSummary | null = null

    try {
      createdTask = (await createEntity('Tasks', {
        Name: taskDraft.Name.trim(),
        Description: taskDraft.Description.trim() || null,
        IsActive: taskDraft.IsActive,
      }) as TaskSummary | undefined) ?? null

      if (!createdTask?.Id) {
        throw new Error('Task was created without a valid identifier.')
      }

      for (const stepDraft of stepDrafts) {
        await createEntity('Steps', {
          TaskId: createdTask.Id,
          Name: stepDraft.Name.trim(),
          Description: stepDraft.Description?.trim() || null,
          IsActive: stepDraft.IsActive,
          Order: stepDraft.Order,
          ApiUrl: stepDraft.ApiUrl.trim(),
          HttpMethod: stepDraft.HttpMethod,
          Headers: stepDraft.Headers?.trim() || null,
          Body: stepDraft.Body?.trim() || null,
        })
      }

      for (const scheduleDraft of scheduleDrafts) {
        await createEntity('Schedules', {
          ...toSchedulePayload(scheduleDraft),
          TaskId: createdTask.Id,
        })
      }

      notify('Task created.', 'success', 2500)
      navigate(taskPaths.overview(createdTask.Id), { replace: true })
    } catch (error) {
      if (createdTask?.Id) {
        notify(
          error instanceof Error
            ? `${error.message} The task was created, but the rest of the setup is incomplete.`
            : 'The task was created, but the rest of the setup is incomplete.',
          'error',
          5000,
        )
        navigate(taskPaths.edit(createdTask.Id), { replace: true })
        return
      }

      notify(error instanceof Error ? error.message : 'Unable to create task.', 'error', 4000)
    } finally {
      setIsSubmitting(false)
    }
  }

  function railMeta(stepKey: WizardStepKey) {
    if (stepKey === 'task') {
      if (currentStep === 'task') {
        return 'Current'
      }

      return validateTaskDraft(taskDraft) ? 'Required' : 'Ready'
    }

    if (stepKey === 'steps') {
      if (currentStep === 'steps') {
        return 'Current'
      }

      if (stepDrafts.length > 0) {
        return `${stepDrafts.length} added`
      }

      if (stepsSkipped) {
        return 'Skipped'
      }

      return 'Optional'
    }

    if (stepKey === 'schedules') {
      if (currentStep === 'schedules') {
        return 'Current'
      }

      if (scheduleDrafts.length > 0) {
        return `${scheduleDrafts.length} added`
      }

      if (schedulesSkipped) {
        return 'Skipped'
      }

      return 'Optional'
    }

    if (currentStep === 'review') {
      return 'Current'
    }

    return highestUnlockedIndex >= 3 ? 'Ready' : 'Locked'
  }

  return (
    <TaskLayoutShell
      sidebar={{
        label: 'Create Task',
        meta: `${completedSteps}/${wizardSteps.length} completed`,
        ariaLabel: 'Task setup wizard navigation',
        items: wizardSteps.map((wizardStep, index) => {
          const isCurrent = index === currentIndex
          const isUnlocked = index <= highestUnlockedIndex

          return {
            key: wizardStep.key,
            label: wizardStep.label,
            leading: index + 1,
            meta: railMeta(wizardStep.key),
            current: isCurrent,
            disabled: !isUnlocked,
            onClick: () => {
              if (isUnlocked) {
                goToIndex(index)
              }
            },
          }
        }),
      }}
      breadcrumbs={currentStep === 'task'
        ? [{ label: 'Tasks', to: taskPaths.catalog }, { label: 'Create Task' }]
        : [{ label: 'Tasks', to: taskPaths.catalog }, { label: 'Create Task' }, { label: wizardSteps[currentIndex].label }]}
      title="Create Task"
      description="Set the task identity now, then add steps and schedules only when they are ready."
      headerContent={(
        <div className="workspace-view__actions workspace-view__actions--spread">
          {currentStep !== 'task' && (
            <button
              type="button"
              className="row-action"
              onClick={() => {
                if (currentStep === 'steps') {
                  goToIndex(0)
                  return
                }

                if (currentStep === 'schedules') {
                  goToIndex(1)
                  return
                }

                goToIndex(2)
              }}
              disabled={isSubmitting}
            >
              Back
            </button>
          )}
          {currentStep === 'task' && (
            <button type="button" className="row-action row-action--primary" onClick={handleTaskNext}>
              Next
            </button>
          )}
          {currentStep === 'steps' && (stepDrafts.length === 0 ? (
            <button
              type="button"
              className="row-action row-action--primary"
              onClick={() => {
                setStepsSkipped(true)
                unlockAndGo(2)
              }}
            >
              Skip for Now
            </button>
          ) : (
            <button type="button" className="row-action row-action--primary" onClick={handleStepsNext}>
              Next
            </button>
          ))}
          {currentStep === 'schedules' && (scheduleDrafts.length === 0 ? (
            <button
              type="button"
              className="row-action row-action--primary"
              onClick={() => {
                setSchedulesSkipped(true)
                unlockAndGo(3)
              }}
            >
              Skip for Now
            </button>
          ) : (
            <button type="button" className="row-action row-action--primary" onClick={handleSchedulesNext}>
              Next
            </button>
          ))}
          {currentStep === 'review' && (
            <button type="button" className="row-action row-action--primary" onClick={() => void handleCreateTask()} disabled={isSubmitting}>
              {isSubmitting ? 'Creating Task...' : 'Create Task'}
            </button>
          )}
        </div>
      )}
      contentClassName="task-create-page"
    >
      <div className="workspace-card workspace-card--flush task-wizard__panel">
        <div className="task-wizard__content">
          {currentStep === 'task' && (
            <>
              <div className="task-wizard__content-header">
                <div className="task-wizard__content-title-block">
                  <h2>Task Details</h2>
                  <p>Start with the core task information, then continue into steps and schedules only if you need them now.</p>
                </div>
                <label className="editor-toggle" htmlFor={`${fieldId}-task-active`}>
                  <input
                    id={`${fieldId}-task-active`}
                    type="checkbox"
                    checked={taskDraft.IsActive}
                    onChange={(event) => {
                      setTaskDraft((currentDraft) => ({ ...currentDraft, IsActive: event.target.checked }))
                    }}
                  />
                  <span>Enabled</span>
                </label>
              </div>

              <div className="task-wizard__content-body">
                <div className="editor-form__grid editor-form__grid--details">
                  <div className="editor-field editor-field--required editor-field--span-2">
                    <label className="editor-field__label" htmlFor={`${fieldId}-task-name`}>
                      Task Name
                    </label>
                    <input
                      id={`${fieldId}-task-name`}
                      className="editor-field__control"
                      type="text"
                      value={taskDraft.Name}
                      onChange={(event) => {
                        setTaskDraft((currentDraft) => ({ ...currentDraft, Name: event.target.value }))
                      }}
                      autoComplete="off"
                    />
                  </div>

                  <div className="editor-field editor-field--span-2">
                    <label className="editor-field__label" htmlFor={`${fieldId}-task-description`}>
                      Description
                    </label>
                    <textarea
                      id={`${fieldId}-task-description`}
                      className="editor-field__control editor-field__control--multiline"
                      value={taskDraft.Description}
                      onChange={(event) => {
                        setTaskDraft((currentDraft) => ({ ...currentDraft, Description: event.target.value }))
                      }}
                      rows={8}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStep === 'steps' && (
            <>
              <div className="task-wizard__content-header">
                <div className="task-wizard__content-title-block">
                  <h2>Steps</h2>
                  <p>Add the requests this task should run. If the task should exist first, skip this step and add requests later.</p>
                </div>
                <button type="button" className="row-action row-action--primary" onClick={addStepDraft}>
                  Add Step
                </button>
              </div>

              <div className="task-wizard__content-body">
                {stepDrafts.length === 0 ? (
                  <div className="task-wizard__empty">
                    <p>No steps added yet.</p>
                  </div>
                ) : (
                  <div className="task-wizard__stack">
                    {stepDrafts.map((stepDraft) => (
                      <section key={stepDraft.LocalId} className="task-wizard__inline-editor">
                        <div className="task-wizard__inline-header">
                          <div className="task-wizard__inline-title-block">
                            <h3>Step {stepDraft.Order}</h3>
                            <p>{stepDraft.Name.trim() || 'Untitled step'}</p>
                          </div>
                          <div className="task-wizard__inline-actions">
                            <label className="editor-toggle" htmlFor={`${fieldId}-${stepDraft.LocalId}-active`}>
                              <input
                                id={`${fieldId}-${stepDraft.LocalId}-active`}
                                type="checkbox"
                                checked={stepDraft.IsActive}
                                onChange={(event) => {
                                  updateStepDraft(stepDraft.LocalId, (currentDraft) => ({
                                    ...currentDraft,
                                    IsActive: event.target.checked,
                                  }))
                                }}
                              />
                              <span>Enabled</span>
                            </label>
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => {
                                removeStepDraft(stepDraft.LocalId)
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="editor-form__grid editor-form__grid--details">
                          <div className="editor-field editor-field--required editor-field--span-2">
                            <label className="editor-field__label" htmlFor={`${fieldId}-${stepDraft.LocalId}-name`}>
                              Step Name
                            </label>
                            <input
                              id={`${fieldId}-${stepDraft.LocalId}-name`}
                              className="editor-field__control"
                              type="text"
                              value={stepDraft.Name}
                              onChange={(event) => {
                                updateStepDraft(stepDraft.LocalId, (currentDraft) => ({
                                  ...currentDraft,
                                  Name: event.target.value,
                                }))
                              }}
                              autoComplete="off"
                            />
                          </div>

                          <div className="editor-field">
                            <label className="editor-field__label" htmlFor={`${fieldId}-${stepDraft.LocalId}-method`}>
                              HTTP Method
                            </label>
                            <select
                              id={`${fieldId}-${stepDraft.LocalId}-method`}
                              className="editor-field__control"
                              value={stepDraft.HttpMethod}
                              onChange={(event) => {
                                updateStepDraft(stepDraft.LocalId, (currentDraft) => ({
                                  ...currentDraft,
                                  HttpMethod: event.target.value,
                                }))
                              }}
                            >
                              {httpMethods.map((method) => (
                                <option key={method} value={method}>
                                  {method}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="editor-field">
                            <label className="editor-field__label" htmlFor={`${fieldId}-${stepDraft.LocalId}-order`}>
                              Run Order
                            </label>
                            <input
                              id={`${fieldId}-${stepDraft.LocalId}-order`}
                              className="editor-field__control"
                              type="number"
                              value={stepDraft.Order}
                              readOnly
                            />
                          </div>

                          <div className="editor-field editor-field--required editor-field--span-2">
                            <label className="editor-field__label" htmlFor={`${fieldId}-${stepDraft.LocalId}-url`}>
                              URL
                            </label>
                            <input
                              id={`${fieldId}-${stepDraft.LocalId}-url`}
                              className="editor-field__control"
                              type="url"
                              value={stepDraft.ApiUrl}
                              onChange={(event) => {
                                updateStepDraft(stepDraft.LocalId, (currentDraft) => ({
                                  ...currentDraft,
                                  ApiUrl: event.target.value,
                                }))
                              }}
                              autoComplete="off"
                              spellCheck={false}
                            />
                          </div>

                          <div className="editor-field editor-field--span-2">
                            <label className="editor-field__label" htmlFor={`${fieldId}-${stepDraft.LocalId}-description`}>
                              Description
                            </label>
                            <textarea
                              id={`${fieldId}-${stepDraft.LocalId}-description`}
                              className="editor-field__control editor-field__control--multiline"
                              value={stepDraft.Description ?? ''}
                              onChange={(event) => {
                                updateStepDraft(stepDraft.LocalId, (currentDraft) => ({
                                  ...currentDraft,
                                  Description: event.target.value,
                                }))
                              }}
                              rows={4}
                            />
                          </div>
                        </div>

                        <div className="editor-form__grid editor-form__grid--request">
                          <div className="editor-field">
                            <label className="editor-field__label" htmlFor={`${fieldId}-${stepDraft.LocalId}-headers`}>
                              Headers (JSON)
                            </label>
                            <textarea
                              id={`${fieldId}-${stepDraft.LocalId}-headers`}
                              className="editor-field__control editor-field__control--multiline editor-field__control--code"
                              value={stepDraft.Headers ?? ''}
                              onChange={(event) => {
                                updateStepDraft(stepDraft.LocalId, (currentDraft) => ({
                                  ...currentDraft,
                                  Headers: event.target.value,
                                }))
                              }}
                              rows={6}
                              spellCheck={false}
                            />
                          </div>

                          <div className="editor-field">
                            <label className="editor-field__label" htmlFor={`${fieldId}-${stepDraft.LocalId}-body`}>
                              Body
                            </label>
                            <textarea
                              id={`${fieldId}-${stepDraft.LocalId}-body`}
                              className="editor-field__control editor-field__control--multiline editor-field__control--code"
                              value={stepDraft.Body ?? ''}
                              onChange={(event) => {
                                updateStepDraft(stepDraft.LocalId, (currentDraft) => ({
                                  ...currentDraft,
                                  Body: event.target.value,
                                }))
                              }}
                              rows={6}
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {currentStep === 'schedules' && (
            <>
              <div className="task-wizard__content-header">
                <div className="task-wizard__content-title-block">
                  <h2>Schedules</h2>
                  <p>Decide when the task should run. If timing is not settled yet, skip this step and come back later.</p>
                </div>
                <button type="button" className="row-action row-action--primary" onClick={addScheduleDraft}>
                  Add Schedule
                </button>
              </div>

              <div className="task-wizard__content-body">
                {scheduleDrafts.length === 0 ? (
                  <div className="task-wizard__empty">
                    <p>No schedules added yet.</p>
                  </div>
                ) : (
                  <div className="task-wizard__stack">
                    {scheduleDrafts.map((scheduleDraft, index) => {
                      const scheduleRule = getScheduleRule(scheduleDraft.TriggerType)
                      const selectedDays = parseDaysOfWeek(scheduleDraft.DaysOfWeek)

                      return (
                        <section key={scheduleDraft.LocalId} className="task-wizard__inline-editor">
                          <div className="task-wizard__inline-header">
                            <div className="task-wizard__inline-title-block">
                              <h3>Schedule {index + 1}</h3>
                              <p>{scheduleDraft.Name.trim() || 'Untitled schedule'}</p>
                            </div>
                            <div className="task-wizard__inline-actions">
                              <label className="editor-toggle" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-active`}>
                                <input
                                  id={`${fieldId}-${scheduleDraft.LocalId}-active`}
                                  type="checkbox"
                                  checked={scheduleDraft.IsActive}
                                  onChange={(event) => {
                                    updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => ({
                                      ...currentDraft,
                                      IsActive: event.target.checked,
                                    }))
                                  }}
                                />
                                <span>Enabled</span>
                              </label>
                              <button
                                type="button"
                                className="row-action"
                                onClick={() => {
                                  removeScheduleDraft(scheduleDraft.LocalId)
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <div className="editor-form__grid editor-form__grid--details">
                            <div className="editor-field editor-field--required editor-field--span-2">
                              <label className="editor-field__label" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-name`}>
                                Schedule
                              </label>
                              <input
                                id={`${fieldId}-${scheduleDraft.LocalId}-name`}
                                className="editor-field__control"
                                type="text"
                                value={scheduleDraft.Name}
                                onChange={(event) => {
                                  updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => ({
                                    ...currentDraft,
                                    Name: event.target.value,
                                  }))
                                }}
                                autoComplete="off"
                              />
                            </div>

                            <div className="editor-field">
                              <label className="editor-field__label" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-pattern`}>
                                Pattern
                              </label>
                              <select
                                id={`${fieldId}-${scheduleDraft.LocalId}-pattern`}
                                className="editor-field__control"
                                value={scheduleDraft.TriggerType}
                                onChange={(event) => {
                                  updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => ({
                                    ...currentDraft,
                                    ...applyTriggerDefaults(currentDraft, event.target.value as ScheduleTriggerType),
                                  }))
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
                              <label className="editor-field__label" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-time`}>
                                Run at
                              </label>
                              <input
                                id={`${fieldId}-${scheduleDraft.LocalId}-time`}
                                className="editor-field__control"
                                type="time"
                                value={scheduleDraft.StartTime ?? ''}
                                onChange={(event) => {
                                  updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => ({
                                    ...currentDraft,
                                    StartTime: normalizeTime(event.target.value),
                                  }))
                                }}
                                step={1}
                                disabled={!scheduleRule.usesStartTime}
                              />
                            </div>

                            <div className="editor-field editor-field--span-2">
                              <label className="editor-field__label" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-description`}>
                                Description
                              </label>
                              <textarea
                                id={`${fieldId}-${scheduleDraft.LocalId}-description`}
                                className="editor-field__control editor-field__control--multiline"
                                value={scheduleDraft.Description ?? ''}
                                onChange={(event) => {
                                  updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => ({
                                    ...currentDraft,
                                    Description: event.target.value,
                                  }))
                                }}
                                rows={4}
                              />
                            </div>
                          </div>

                          <div className="editor-form__grid editor-form__grid--timing">
                            {scheduleRule.usesIntervalTime && (
                              <div className="editor-field">
                                <label className="editor-field__label" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-interval`}>
                                  Every (minutes)
                                </label>
                                <input
                                  id={`${fieldId}-${scheduleDraft.LocalId}-interval`}
                                  className="editor-field__control"
                                  type="number"
                                  min={1}
                                  value={scheduleDraft.IntervalTime ?? ''}
                                  onChange={(event) => {
                                    const nextValue = event.target.valueAsNumber
                                    updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => ({
                                      ...currentDraft,
                                      IntervalTime: Number.isNaN(nextValue) ? null : nextValue,
                                    }))
                                  }}
                                />
                              </div>
                            )}

                            {scheduleRule.usesDayOfMonth && (
                              <div className="editor-field">
                                <label className="editor-field__label" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-day-of-month`}>
                                  Day of month
                                </label>
                                <input
                                  id={`${fieldId}-${scheduleDraft.LocalId}-day-of-month`}
                                  className="editor-field__control"
                                  type="number"
                                  min={1}
                                  max={31}
                                  value={scheduleDraft.DayOfMonth ?? ''}
                                  onChange={(event) => {
                                    const nextValue = event.target.valueAsNumber
                                    updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => ({
                                      ...currentDraft,
                                      DayOfMonth: Number.isNaN(nextValue) ? null : nextValue,
                                    }))
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {scheduleRule.usesDaysOfWeek && (
                            <fieldset className="editor-fieldset">
                              <legend className="editor-field__label">Weekdays</legend>
                              <div className="editor-choice-grid">
                                {weekDayOptions.map((option) => {
                                  const isSelected = selectedDays.includes(option.value)

                                  return (
                                    <label key={option.value} className="editor-choice" htmlFor={`${fieldId}-${scheduleDraft.LocalId}-${option.value}`}>
                                      <input
                                        id={`${fieldId}-${scheduleDraft.LocalId}-${option.value}`}
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(event) => {
                                          updateScheduleDraft(scheduleDraft.LocalId, (currentDraft) => {
                                            const currentDays = parseDaysOfWeek(currentDraft.DaysOfWeek)
                                            const nextDays = event.target.checked
                                              ? Array.from(new Set([...currentDays, option.value]))
                                              : currentDays.filter((currentDay) => currentDay !== option.value)

                                            return {
                                              ...currentDraft,
                                              DaysOfWeek: nextDays,
                                            }
                                          })
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
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {currentStep === 'review' && (
            <>
              <div className="task-wizard__content-header">
                <div className="task-wizard__content-title-block">
                  <h2>Review</h2>
                  <p>Check the setup before creating the task. Use the edit actions below to jump back to any section.</p>
                </div>
              </div>

              <div className="task-wizard__content-body">
                <div className="task-wizard__summary">
                  <section className="task-wizard__summary-section">
                    <div className="task-wizard__summary-header">
                      <div>
                        <h3>Task Details</h3>
                      </div>
                      <button type="button" className="row-action" onClick={() => goToIndex(0)}>
                        Edit Task Details
                      </button>
                    </div>

                    <dl className="task-wizard__summary-list">
                      <div className="task-wizard__summary-row">
                        <dt>Name</dt>
                        <dd>{taskDraft.Name.trim() || 'Not provided'}</dd>
                      </div>
                      <div className="task-wizard__summary-row">
                        <dt>Enabled</dt>
                        <dd>{taskDraft.IsActive ? 'Enabled' : 'Disabled'}</dd>
                      </div>
                      <div className="task-wizard__summary-row">
                        <dt>Description</dt>
                        <dd>{formatOptionalText(taskDraft.Description)}</dd>
                      </div>
                    </dl>
                  </section>

                  <section className="task-wizard__summary-section">
                    <div className="task-wizard__summary-header">
                      <div>
                        <h3>Steps</h3>
                      </div>
                      <button type="button" className="row-action" onClick={() => goToIndex(1)}>
                        Edit Steps
                      </button>
                    </div>

                    {stepDrafts.length === 0 ? (
                      <p className="task-wizard__summary-empty">No steps added yet.</p>
                    ) : (
                      <div className="task-wizard__summary-records">
                        {stepDrafts.map((stepDraft) => (
                          <div key={stepDraft.LocalId} className="task-wizard__summary-record">
                            <strong>{stepDraft.Name.trim() || `Step ${stepDraft.Order}`}</strong>
                            <span>{stepDraft.HttpMethod} {stepDraft.ApiUrl.trim() || 'No URL yet'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="task-wizard__summary-section">
                    <div className="task-wizard__summary-header">
                      <div>
                        <h3>Schedules</h3>
                      </div>
                      <button type="button" className="row-action" onClick={() => goToIndex(2)}>
                        Edit Schedules
                      </button>
                    </div>

                    {scheduleDrafts.length === 0 ? (
                      <p className="task-wizard__summary-empty">No schedules added yet.</p>
                    ) : (
                      <div className="task-wizard__summary-records">
                        {scheduleDrafts.map((scheduleDraft) => (
                          <div key={scheduleDraft.LocalId} className="task-wizard__summary-record">
                            <strong>{scheduleDraft.Name.trim() || 'Untitled schedule'}</strong>
                            <span>{buildScheduleSummary(scheduleDraft)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TaskLayoutShell>
  )
}

function getScheduleRule(triggerType: ScheduleTriggerType) {
  return {
    Interval: {
      usesIntervalTime: true,
      usesStartTime: false,
      usesDaysOfWeek: false,
      usesDayOfMonth: false,
    },
    Daily: {
      usesIntervalTime: false,
      usesStartTime: true,
      usesDaysOfWeek: false,
      usesDayOfMonth: false,
    },
    Weekly: {
      usesIntervalTime: false,
      usesStartTime: true,
      usesDaysOfWeek: true,
      usesDayOfMonth: false,
    },
    Monthly: {
      usesIntervalTime: false,
      usesStartTime: true,
      usesDaysOfWeek: false,
      usesDayOfMonth: true,
    },
  }[triggerType]
}