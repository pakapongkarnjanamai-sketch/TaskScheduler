import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
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
  const { lastUpdate } = useTaskUpdatesContext()
  const [task, setTask] = useState<TaskSummary | null>(null)
  const [step, setStep] = useState<Step | null>(null)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stepsRefreshKey, setStepsRefreshKey] = useState(0)
  const [schedulesRefreshKey, setSchedulesRefreshKey] = useState(0)

  useEffect(() => {
    let ignore = false

    async function loadWorkspace() {
      if (!Number.isFinite(taskId) || taskId <= 0) {
        setTask(null)
        setStep(null)
        setSchedule(null)
        setLoadError('The selected task route is invalid.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const loadedTask = await loadEntityById<TaskSummary>('Tasks', taskId)
        if (!loadedTask) {
          throw new Error('The requested task could not be found.')
        }

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

        setTask(loadedTask)
        setStep(loadedStep)
        setSchedule(loadedSchedule)
      } catch (error) {
        if (ignore) {
          return
        }

        setTask(null)
        setStep(null)
        setSchedule(null)
        setLoadError(error instanceof Error ? error.message : 'Unable to open the task workspace.')
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    void loadWorkspace()

    return () => {
      ignore = true
    }
  }, [scheduleId, stepId, taskId, view])

  async function refreshTaskSummary() {
    if (!Number.isFinite(taskId) || taskId <= 0) {
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

  function renderTaskStatus(currentTask: TaskSummary) {
    return (
      <div className="status-row">
        <span>State</span>
        <StatusText value={currentTask.IsActive ? 'Enabled' : 'Disabled'} />
        <span>Last</span>
        <StatusText value={currentTask.LastStatus} />
      </div>
    )
  }

  function renderOverview(currentTask: TaskSummary) {
    return (
      <section className="workspace-view">
        <div className="workspace-view__header">
          <div>
            <p className="workspace-view__eyebrow">Task Overview</p>
            <h2>{currentTask.Name}</h2>
            {currentTask.Description?.trim() && <p className="workspace-view__description">{currentTask.Description.trim()}</p>}
          </div>
          {renderTaskStatus(currentTask)}
        </div>

        <div className="summary-grid">
          <div className="summary-metric">
            <span>Last Run</span>
            <strong>{formatDateTime(currentTask.LastExecutionTime, 'Never run')}</strong>
          </div>
          <div className="summary-metric">
            <span>Next Run</span>
            <strong>{formatDateTime(currentTask.NextExecutionTime, 'Not scheduled')}</strong>
          </div>
          <div className="summary-metric">
            <span>Last Status</span>
            <strong>{currentTask.LastStatus || 'Not run'}</strong>
          </div>
          <div className="summary-metric">
            <span>Last Updated</span>
            <strong>{formatDateTime(currentTask.UpdatedAt, 'Not updated')}</strong>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-section__header">
            <div>
              <p className="workspace-view__eyebrow">Actions</p>
              <h3>Task Surfaces</h3>
            </div>
          </div>
          <div className="row-action-group">
            <button type="button" className="row-action row-action--primary" onClick={() => navigate(taskPaths.schedules(currentTask.Id))}>
              Schedules
            </button>
            <button type="button" className="row-action row-action--primary" onClick={() => navigate(taskPaths.steps(currentTask.Id))}>
              Steps
            </button>
            <button type="button" className="row-action" onClick={() => navigate(taskPaths.history(currentTask.Id))}>
              History
            </button>
            <button type="button" className="row-action" onClick={() => navigate(taskPaths.edit(currentTask.Id))}>
              Task Details
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="workspace-state">
        <p className="workspace-state__eyebrow">Task Workspace</p>
        <h2>Loading task workspace</h2>
      </section>
    )
  }

  if (loadError || !currentTask) {
    return (
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
    )
  }

  return (
    <section className="workspace-shell">
      <aside className="workspace-rail" aria-label="Task workspace navigation">
        <div className="workspace-rail__header">
          <div className="workspace-rail__actions">
            <button type="button" className="row-action" onClick={() => navigate(taskPaths.catalog)}>
              Back to catalog
            </button>
          </div>
          <div>
            <p className="workspace-view__eyebrow">Task Workspace</p>
            <h2>{currentTask.Name}</h2>
          </div>
          {renderTaskStatus(currentTask)}
        </div>

        <div className="workspace-rail__meta">
          <div className="workspace-rail__meta-item">
            <span>Next run</span>
            <strong>{formatDateTime(currentTask.NextExecutionTime, 'Not scheduled')}</strong>
          </div>
          <div className="workspace-rail__meta-item">
            <span>Last run</span>
            <strong>{formatDateTime(currentTask.LastExecutionTime, 'Never run')}</strong>
          </div>
          <div className="workspace-rail__meta-item">
            <span>Last updated</span>
            <strong>{formatDateTime(currentTask.UpdatedAt, 'Not updated')}</strong>
          </div>
        </div>

        <nav className="workspace-rail__nav">
          <NavLink to={taskPaths.overview(currentTask.Id)} end className={({ isActive }) => isActive ? 'workspace-rail__link workspace-rail__link--active' : 'workspace-rail__link'}>
            Overview
          </NavLink>
          <NavLink to={taskPaths.edit(currentTask.Id)} className={({ isActive }) => isActive ? 'workspace-rail__link workspace-rail__link--active' : 'workspace-rail__link'}>
            Task Details
          </NavLink>
          <NavLink to={taskPaths.steps(currentTask.Id)} className={({ isActive }) => isActive ? 'workspace-rail__link workspace-rail__link--active' : 'workspace-rail__link'}>
            Steps
          </NavLink>
          <NavLink to={taskPaths.schedules(currentTask.Id)} className={({ isActive }) => isActive ? 'workspace-rail__link workspace-rail__link--active' : 'workspace-rail__link'}>
            Schedules
          </NavLink>
          <NavLink to={taskPaths.history(currentTask.Id)} className={({ isActive }) => isActive ? 'workspace-rail__link workspace-rail__link--active' : 'workspace-rail__link'}>
            Execution History
          </NavLink>
          <NavLink to={taskPaths.stepLogs(currentTask.Id)} className={({ isActive }) => isActive ? 'workspace-rail__link workspace-rail__link--active' : 'workspace-rail__link'}>
            Step Logs
          </NavLink>
        </nav>
      </aside>

      <div className="workspace-content">
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
      </div>
    </section>
  )
}