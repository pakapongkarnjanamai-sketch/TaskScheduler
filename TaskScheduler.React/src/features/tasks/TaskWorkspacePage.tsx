import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { loadEntityById } from '../../api/adminApi'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
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

const workspaceMenuLabelByView: Record<TaskWorkspaceView, string> = {
  overview: 'Overview',
  'task-editor': 'Details',
  steps: 'Steps',
  'step-editor': 'Step',
  schedules: 'Schedules',
  'schedule-editor': 'Schedule',
  history: 'Execution History',
  'step-logs': 'Logs',
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
  const [contentError, setContentError] = useState<string | null>(null)
  const [stepsRefreshKey, setStepsRefreshKey] = useState(0)
  const [schedulesRefreshKey, setSchedulesRefreshKey] = useState(0)
  const [isRailOpen, setIsRailOpen] = useState(true)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 960px)')
    const syncRailState = (isMobile: boolean) => {
      setIsRailOpen(!isMobile)
    }

    syncRailState(mediaQuery.matches)
    const handleChange = (event: MediaQueryListEvent) => {
      syncRailState(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Load the task only when taskId changes — NOT when view changes
  useEffect(() => {
    let ignore = false

    async function doLoadTask() {
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
  }, [taskId])

  // Load sub-entity (step / schedule) only when view or sub-entity IDs change
  useEffect(() => {
    let ignore = false

    async function doLoadSubEntity() {
      setContentError(null)

      if (!Number.isFinite(taskId) || taskId <= 0) {
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
  }, [taskId, view, stepId, scheduleId])

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
  function getMenuSegments(currentView: TaskWorkspaceView) {
    if (currentView === 'step-editor') {
      return ['Step', stepId ? 'Editor' : 'Add']
    }

    if (currentView === 'schedule-editor') {
      return ['Schedule', scheduleId ? 'Editor' : 'Add']
    }

    return [workspaceMenuLabelByView[currentView]]
  }

  const menuSegments = getMenuSegments(view)

  function navLinkClass({ isActive }: { isActive: boolean }) {
    return isActive ? 'workspace-rail__link workspace-rail__link--active' : 'workspace-rail__link'
  }

  function handleRailNavigation() {
    if (window.matchMedia('(max-width: 960px)').matches) {
      setIsRailOpen(false)
    }
  }

  function renderBreadcrumb(taskName: string) {
    const breadcrumbSegments = ['Tasks', taskName, ...menuSegments]

    return (
      <p className="workspace-breadcrumb" aria-label="Workspace breadcrumb">
        {breadcrumbSegments.map((segment, index) => (
          <span key={`${segment}-${index}`} className="workspace-breadcrumb__item">
            {index > 0 && <span className="workspace-breadcrumb__separator">/</span>}
            {index === 0 ? (
              <NavLink to={taskPaths.catalog} className="workspace-breadcrumb__link">
                {segment}
              </NavLink>
            ) : (
              <span>{segment}</span>
            )}
          </span>
        ))}
      </p>
    )
  }



  function renderOverview(t: TaskSummary) {
    return (
      <section className="workspace-view">
        {renderBreadcrumb(t.Name)}

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
  if (!Number.isFinite(taskId) || taskId <= 0) {
    return (
      <section className="workspace-state">
        <p className="workspace-state__eyebrow">Task Workspace</p>
        <h2>Unable to open this task</h2>
        <p>The selected task route is invalid.</p>
        <div className="workspace-state__actions">
          <button type="button" className="row-action row-action--primary" onClick={() => navigate(taskPaths.catalog)}>
            Return to catalog
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={isRailOpen ? 'workspace-shell' : 'workspace-shell workspace-shell--rail-collapsed'}>
      <aside className="workspace-rail" aria-label="Task workspace navigation">
        <nav id="task-workspace-nav" className="workspace-rail__nav">
          <NavLink to={taskPaths.overview(taskId)} end className={navLinkClass} onClick={handleRailNavigation}>
            Overview
          </NavLink>
          <NavLink to={taskPaths.edit(taskId)} className={navLinkClass} onClick={handleRailNavigation}>
            Task Details
          </NavLink>
          <NavLink to={taskPaths.steps(taskId)} className={navLinkClass} onClick={handleRailNavigation}>
            Steps
          </NavLink>
          <NavLink to={taskPaths.schedules(taskId)} className={navLinkClass} onClick={handleRailNavigation}>
            Schedules
          </NavLink>
          <NavLink to={taskPaths.history(taskId)} className={navLinkClass} onClick={handleRailNavigation}>
            Execution History
          </NavLink>
          <NavLink to={taskPaths.stepLogs(taskId)} className={navLinkClass} onClick={handleRailNavigation}>
            Step Logs
          </NavLink>
        </nav>
      </aside>

      <div className="workspace-content">
        <button
          type="button"
          className="workspace-rail-toggle"
          onClick={() => setIsRailOpen((currentValue) => !currentValue)}
          aria-expanded={isRailOpen}
          aria-controls="task-workspace-nav"
        >
          Menu
        </button>
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
            </div>
          </section>
        ) : (
          <>
            {view === 'overview' && renderOverview(currentTask)}
            {view === 'task-editor' && (
              <TaskEditorForm
                key={currentTask.Id}
                task={currentTask}
                breadcrumb={renderBreadcrumb(currentTask.Name)}
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
                breadcrumb={renderBreadcrumb(currentTask.Name)}
                onCreate={() => navigate(taskPaths.newStep(currentTask.Id))}
                onEdit={(selectedStep) => navigate(taskPaths.editStep(currentTask.Id, selectedStep.Id))}
              />
            )}
            {view === 'step-editor' && (
              <StepEditorForm
                key={step?.Id ?? `new-step-${currentTask.Id}`}
                task={currentTask}
                step={step}
                breadcrumb={renderBreadcrumb(currentTask.Name)}
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
                breadcrumb={renderBreadcrumb(currentTask.Name)}
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
                breadcrumb={renderBreadcrumb(currentTask.Name)}
                onCancel={() => navigate(taskPaths.schedules(currentTask.Id))}
                onSaved={() => {
                  setSchedule(null)
                  setSchedulesRefreshKey((currentValue) => currentValue + 1)
                  void refreshTaskSummary()
                  navigate(taskPaths.schedules(currentTask.Id))
                }}
              />
            )}
            {view === 'history' && <ExecutionHistoryView task={currentTask} breadcrumb={renderBreadcrumb(currentTask.Name)} />}
            {view === 'step-logs' && <StepLogsView task={currentTask} breadcrumb={renderBreadcrumb(currentTask.Name)} />}
          </>
        )}
      </div>
    </section>
  )
}