import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadEntityById } from '../../api/adminApi'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
import { StatusText } from '../../components/StatusText'
import { ExecutionHistoryView } from '../logs/ExecutionHistoryView'
import { StepLogsView } from '../logs/StepLogsView'
import { ScheduleEditorForm } from '../schedules/ScheduleEditorForm'
import { SchedulesGrid } from '../schedules/SchedulesGrid'
import { StepEditorForm } from '../steps/StepEditorForm'
import { StepsGrid } from '../steps/StepsGrid'
import type { Schedule, Step, TaskSummary } from '../../types/entities'
import { TaskLayoutShell, type TaskShellBreadcrumb, type TaskShellNavItem } from './TaskLayoutShell'
import { TaskEditorForm } from './TaskEditorForm'
import { taskPaths } from './taskRoutes'

export type TaskWorkspaceView =
  | 'overview'
  | 'task-editor'
  | 'steps'
  | 'step-editor'
  | 'schedules'
  | 'schedule-editor'
  | 'history'
  | 'step-logs'

type TaskWorkspacePageProps = {
  view: TaskWorkspaceView
}

const workspaceMenuLabelByView: Record<TaskWorkspaceView, string> = {
  overview: 'Overview',
  'task-editor': 'Details',
  steps: 'Steps',
  'step-editor': 'Step',
  schedules: 'Schedules',
  'schedule-editor': 'Schedule',
  history: 'History',
  'step-logs': 'Logs',
}

const workspaceDescriptionByView: Record<TaskWorkspaceView, string> = {
  overview: 'Monitor recent runs, next execution timing, and the latest health signals for this task.',
  'task-editor': 'Update the task identity and any operating notes the team needs while managing it.',
  steps: 'Review, order, and maintain the request steps this task should run.',
  'step-editor': 'Define the request, payload, and ordering details for this step.',
  schedules: 'Review the recurring schedules attached to this task and their next run timing.',
  'schedule-editor': 'Choose the recurrence pattern and fill only the timing fields that apply.',
  history: 'Inspect task-level execution history and recent response messages.',
  'step-logs': 'Inspect step-level logs to troubleshoot failures and confirm downstream responses.',
}

function formatDateTime(value?: string | null, fallback = 'Not available') {
  if (!value) {
    return fallback
  }

  const parsedValue = new Date(value)
  if (Number.isNaN(parsedValue.getTime())) {
    return fallback
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedValue)
}

export function TaskWorkspacePage({ view }: TaskWorkspacePageProps) {
  const navigate = useNavigate()
  const { taskId: taskIdParam, stepId: stepIdParam, scheduleId: scheduleIdParam } = useParams()
  const taskId = Number(taskIdParam)
  const stepId = stepIdParam ? Number(stepIdParam) : null
  const scheduleId = scheduleIdParam ? Number(scheduleIdParam) : null
  const hasInvalidTaskRoute = !Number.isFinite(taskId) || taskId <= 0
  const { lastUpdate } = useTaskUpdatesContext()
  const [task, setTask] = useState<TaskSummary | null>(null)
  const [step, setStep] = useState<Step | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)
  const [stepsRefreshKey, setStepsRefreshKey] = useState(0)
  const [schedulesRefreshKey, setSchedulesRefreshKey] = useState(0)

  useEffect(() => {
    if (hasInvalidTaskRoute) {
      navigate(taskPaths.catalog, { replace: true })
    }
  }, [hasInvalidTaskRoute, navigate])

  // Load the task only when taskId changes — NOT when view changes
  useEffect(() => {
    let ignore = false

    async function doLoadTask() {
      if (hasInvalidTaskRoute) {
        setTask(null)
        setStep(null)
        setSchedule(null)
        setLoadError('The selected task route is invalid.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError(null)
      setContentError(null)

      try {
        const loadedTask = await loadEntityById<TaskSummary>('Tasks', taskId)
        if (!loadedTask) {
          throw new Error('The requested task could not be found.')
        }
        if (ignore) {
          return
        }
        setTask(loadedTask)
        setStep(null)
        setSchedule(null)
      } catch (error) {
        if (ignore) {
          return
        }
        setTask(null)
        setLoadError(error instanceof Error ? error.message : 'Unable to open the task workspace.')
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void doLoadTask()

    return () => {
      ignore = true
    }
  }, [hasInvalidTaskRoute, taskId])

  // Load sub-entity (step / schedule) only when view or sub-entity IDs change
  useEffect(() => {
    let ignore = false

    async function doLoadSubEntity() {
      setContentError(null)

      if (hasInvalidTaskRoute) {
        return
      }

      if (view !== 'step-editor' && view !== 'schedule-editor') {
        setStep(null)
        setSchedule(null)
        return
      }

      try {
        const loadedStep = view === 'step-editor' && stepId
          ? await loadEntityById<Step>('Steps', stepId, ['TaskId', '=', taskId])
          : null
        const loadedSchedule = view === 'schedule-editor' && scheduleId
          ? await loadEntityById<Schedule>('Schedules', scheduleId, ['TaskId', '=', taskId])
          : null

        if (view === 'step-editor' && stepId && !loadedStep) {
          throw new Error('The requested step does not belong to this task.')
        }
        if (view === 'schedule-editor' && scheduleId && !loadedSchedule) {
          throw new Error('The requested schedule does not belong to this task.')
        }

        if (ignore) {
          return
        }
        setStep(loadedStep)
        setSchedule(loadedSchedule)
      } catch (error) {
        if (ignore) {
          return
        }
        setContentError(error instanceof Error ? error.message : 'Unable to load the selected item.')
      }
    }

    void doLoadSubEntity()

    return () => {
      ignore = true
    }
  }, [hasInvalidTaskRoute, taskId, view, stepId, scheduleId])

  async function refreshTaskSummary() {
    if (hasInvalidTaskRoute) {
      return
    }

    const refreshedTask = await loadEntityById<TaskSummary>('Tasks', taskId)
    if (refreshedTask) {
      setTask(refreshedTask)
    }
  }

  const currentTask = lastUpdate && lastUpdate.taskId === task?.Id
    ? { ...task, ...lastUpdate.payload }
    : task
  function getCurrentSectionLabel(currentView: TaskWorkspaceView) {
    if (currentView === 'step-editor') {
      return stepId ? 'Edit Step' : 'New Step'
    }

    if (currentView === 'schedule-editor') {
      return scheduleId ? 'Edit Schedule' : 'New Schedule'
    }

    return workspaceMenuLabelByView[currentView]
  }

  const currentSectionLabel = getCurrentSectionLabel(view)
  const shellBreadcrumbs: TaskShellBreadcrumb[] = currentTask
    ? view === 'overview'
      ? [
          { label: 'Tasks', to: taskPaths.catalog },
          { label: currentTask.Name },
        ]
      : [
          { label: 'Tasks', to: taskPaths.catalog },
          { label: currentTask.Name, to: taskPaths.overview(currentTask.Id) },
          { label: currentSectionLabel },
        ]
    : [
        { label: 'Tasks', to: taskPaths.catalog },
        { label: 'Task Workspace' },
      ]

  const shellNavItems: TaskShellNavItem[] = [
    { key: 'overview', label: 'Overview', to: taskPaths.overview(taskId), end: true },
    { key: 'task-editor', label: 'Details', to: taskPaths.edit(taskId) },
    { key: 'steps', label: 'Steps', to: taskPaths.steps(taskId) },
    { key: 'schedules', label: 'Schedules', to: taskPaths.schedules(taskId) },
    { key: 'history', label: 'History', to: taskPaths.history(taskId) },
    { key: 'step-logs', label: 'Logs', to: taskPaths.stepLogs(taskId) },
  ]



  function renderOverview(t: TaskSummary) {
    return (
      <section className="workspace-view">
        <div className="summary-grid">
          <div className="summary-metric">
            <span>Last Run</span>
            <strong>{formatDateTime(t.LastExecutionTime, 'Never run')}</strong>
          </div>
          <div className="summary-metric">
            <span>Next Run</span>
            <strong>{formatDateTime(t.NextExecutionTime, 'Not scheduled')}</strong>
          </div>
          <div className="summary-metric">
            <span>Last Status</span>
            <strong>{t.LastStatus || 'Not run'}</strong>
          </div>
          <div className="summary-metric">
            <span>Last Updated</span>
            <strong>{formatDateTime(t.UpdatedAt, 'Not updated')}</strong>
          </div>
        </div>
      </section>
    )
  }

  // Only show a full-screen state when the taskId itself is invalid (can't even show the rail)
  if (hasInvalidTaskRoute) {
    return null
  }

  return (
    <TaskLayoutShell
      sidebar={{
        label: currentTask?.Name ?? 'Task Workspace',
        meta: currentSectionLabel,
        ariaLabel: 'Task workspace navigation',
        items: shellNavItems,
      }}
      breadcrumbs={shellBreadcrumbs}
      title={currentTask?.Name ?? 'Task Workspace'}
      description={currentTask ? workspaceDescriptionByView[view] : 'Loading task context.'}
      topBarContent={currentTask ? (
        <div className="status-row">
          <span>Status</span>
          <StatusText value={currentTask.LastStatus || 'Not run'} />
        </div>
      ) : undefined}
    >
        {isLoading ? (
          <section className="workspace-state">
            <p className="workspace-state__eyebrow">Task Workspace</p>
            <h2>Loading task workspace</h2>
          </section>
        ) : loadError || !currentTask ? (
          <section className="workspace-state">
            <p className="workspace-state__eyebrow">Task Workspace</p>
            <h2>Unable to open this task</h2>
            <p>{loadError || 'The requested task is unavailable.'}</p>
            <div className="workspace-state__actions">
              <button type="button" className="row-action row-action--primary" onClick={() => navigate(taskPaths.catalog)}>
                Return to catalog
              </button>
            </div>
          </section>
        ) : contentError ? (
          <section className="workspace-state">
            <p className="workspace-state__eyebrow">Task Workspace</p>
            <h2>Unable to open this item</h2>
            <p>{contentError}</p>
            <div className="workspace-state__actions">
              <button type="button" className="row-action" onClick={() => navigate(taskPaths.overview(currentTask.Id))}>
                Return to overview
              </button>
            </div>
          </section>
        ) : (
          <>
            {view === 'overview' && renderOverview(currentTask)}
            {view === 'task-editor' && (
              <TaskEditorForm
                key={currentTask.Id}
                task={currentTask}
                onCancel={() => navigate(taskPaths.overview(currentTask.Id))}
                onSaved={(savedTask) => {
                  setTask(savedTask)
                  navigate(taskPaths.overview(savedTask.Id))
                }}
              />
            )}
            {view === 'steps' && (
              <StepsGrid
                key={`${currentTask.Id}-${stepsRefreshKey}`}
                taskId={currentTask.Id}
                refreshKey={stepsRefreshKey}
                onCreate={() => navigate(taskPaths.newStep(currentTask.Id))}
                onEdit={(selectedStep) => navigate(taskPaths.editStep(currentTask.Id, selectedStep.Id))}
              />
            )}
            {view === 'step-editor' && (
              <StepEditorForm
                key={step?.Id ?? `new-step-${currentTask.Id}`}
                task={currentTask}
                step={step}
                onCancel={() => navigate(taskPaths.steps(currentTask.Id))}
                onSaved={(savedStep) => {
                  setStep(savedStep)
                  setStepsRefreshKey((currentValue) => currentValue + 1)
                  navigate(taskPaths.steps(currentTask.Id))
                }}
              />
            )}
            {view === 'schedules' && (
              <SchedulesGrid
                key={`${currentTask.Id}-${schedulesRefreshKey}`}
                taskId={currentTask.Id}
                refreshKey={schedulesRefreshKey}
                onCreate={() => navigate(taskPaths.newSchedule(currentTask.Id))}
                onEdit={(selectedSchedule) => navigate(taskPaths.editSchedule(currentTask.Id, selectedSchedule.Id))}
                onChanged={() => {
                  void refreshTaskSummary()
                }}
              />
            )}
            {view === 'schedule-editor' && (
              <ScheduleEditorForm
                key={schedule?.Id ?? `new-schedule-${currentTask.Id}`}
                task={currentTask}
                schedule={schedule}
                onCancel={() => navigate(taskPaths.schedules(currentTask.Id))}
                onSaved={() => {
                  setSchedule(null)
                  setSchedulesRefreshKey((currentValue) => currentValue + 1)
                  void refreshTaskSummary()
                  navigate(taskPaths.schedules(currentTask.Id))
                }}
              />
            )}
            {view === 'history' && <ExecutionHistoryView task={currentTask} />}
            {view === 'step-logs' && <StepLogsView task={currentTask} />}
          </>
        )}
    </TaskLayoutShell>
  )
}