import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadEntities } from '../../api/adminApi'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
import { StatusText } from '../../components/StatusText'
import type { Schedule, TaskSummary } from '../../types/entities'
import { TaskLayoutShell } from './TaskLayoutShell'
import { taskPaths } from './taskRoutes'

type DashboardModel = {
  totals: {
    taskCount: number
    activeTaskCount: number
    scheduleCount: number
    activeScheduleCount: number
  }
  watch: {
    healthyTasks: number
    attentionTasks: number
    overdueTasks: number
    missingScheduleTasks: number
    schedulesWithoutNextRun: number
  }
  abnormalities: Array<{
    taskId: number
    name: string
    signals: string[]
    lastStatus: string
    nextExecutionTime?: string | null
  }>
  upcomingSchedules: Array<{
    id: number
    taskId: number
    name: string
    nextExecutionTime: string
    isActive: boolean
  }>
}

function hasFailureStatus(value?: string | null) {
  if (!value) {
    return false
  }

  return value.toLowerCase().includes('fail')
}

function hasRunningStatus(value?: string | null) {
  if (!value) {
    return false
  }

  return value.toLowerCase().includes('running')
}

function isOverdue(isoTime?: string | null) {
  if (!isoTime) {
    return false
  }

  const nextRunTime = new Date(isoTime).getTime()
  return Number.isFinite(nextRunTime) && nextRunTime < Date.now()
}

function toDateTimeLabel(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function buildDashboardModel(tasks: TaskSummary[], schedules: Schedule[]): DashboardModel {
  const activeTasks = tasks.filter((task) => task.IsActive)
  const activeTaskIds = new Set(activeTasks.map((task) => task.Id))
  const activeSchedules = schedules.filter((schedule) => schedule.IsActive)

  const scheduleCountByTaskId = schedules.reduce<Record<number, number>>((accumulator, schedule) => {
    accumulator[schedule.TaskId] = (accumulator[schedule.TaskId] ?? 0) + 1
    return accumulator
  }, {})

  const schedulesWithoutNextRun = activeSchedules.filter((schedule) => !schedule.NextExecutionTime).length

  const abnormalities = tasks
    .map((task) => {
      const signals: string[] = []

      if (!task.IsActive) {
        signals.push('Task is disabled')
      }

      if (hasFailureStatus(task.LastStatus)) {
        signals.push('Last run failed')
      }

      if (hasRunningStatus(task.LastStatus)) {
        signals.push('Execution still running')
      }

      if (task.IsActive && isOverdue(task.NextExecutionTime)) {
        signals.push('Next run is overdue')
      }

      if (task.IsActive && (scheduleCountByTaskId[task.Id] ?? 0) === 0) {
        signals.push('No schedule configured')
      }

      return {
        taskId: task.Id,
        name: task.Name,
        signals,
        lastStatus: task.LastStatus ?? 'Unknown',
        nextExecutionTime: task.NextExecutionTime,
      }
    })
    .filter((item) => item.signals.length > 0)
    .sort((left, right) => right.signals.length - left.signals.length || left.name.localeCompare(right.name))

  const overdueTasks = activeTasks.filter((task) => isOverdue(task.NextExecutionTime)).length
  const missingScheduleTasks = activeTasks.filter((task) => (scheduleCountByTaskId[task.Id] ?? 0) === 0).length
  const activeAttentionTaskIds = new Set(
    abnormalities
      .filter((item) => activeTaskIds.has(item.taskId))
      .map((item) => item.taskId),
  )

  const upcomingSchedules = schedules
    .filter((schedule) => typeof schedule.NextExecutionTime === 'string' && schedule.NextExecutionTime.length > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.NextExecutionTime as string).getTime()
      const rightTime = new Date(right.NextExecutionTime as string).getTime()
      return leftTime - rightTime
    })
    .slice(0, 8)
    .map((schedule) => ({
      id: schedule.Id,
      taskId: schedule.TaskId,
      name: schedule.Name,
      nextExecutionTime: schedule.NextExecutionTime as string,
      isActive: schedule.IsActive,
    }))

  return {
    totals: {
      taskCount: tasks.length,
      activeTaskCount: activeTasks.length,
      scheduleCount: schedules.length,
      activeScheduleCount: activeSchedules.length,
    },
    watch: {
      healthyTasks: activeTasks.length - activeAttentionTaskIds.size,
      attentionTasks: abnormalities.length,
      overdueTasks,
      missingScheduleTasks,
      schedulesWithoutNextRun,
    },
    abnormalities: abnormalities.slice(0, 12),
    upcomingSchedules,
  }
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { lastUpdate } = useTaskUpdatesContext()
  const [model, setModel] = useState<DashboardModel | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const [tasks, schedules] = await Promise.all([
        loadEntities<TaskSummary>('Tasks'),
        loadEntities<Schedule>('Schedules'),
      ])

      setModel(buildDashboardModel(tasks, schedules))
      setErrorMessage(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load dashboard data.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshDashboard = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)
    await loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (!lastUpdate) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard()
  }, [lastUpdate, loadDashboard])

  const sidebar = useMemo(() => ({
    label: 'Main Navigation',
    ariaLabel: 'Main navigation',
    items: [
      { key: 'dashboard', label: 'Dashboard', to: taskPaths.dashboard, end: true },
      { key: 'catalog', label: 'Task Catalog', to: taskPaths.catalog, end: true },
    ],
  }), [])

  return (
    <TaskLayoutShell
      sidebar={sidebar}
      title="Dashboard"
      description="Operational overview with immediate visibility for unstable or abnormal task behavior."
      showTopBar={false}
      headerContent={(
        <div className="workspace-view__actions">
          <button type="button" className="row-action" onClick={() => void refreshDashboard()} disabled={isLoading}>
            Refresh
          </button>
          <button type="button" className="row-action row-action--primary" onClick={() => navigate(taskPaths.catalog)}>
            Open Task Catalog
          </button>
        </div>
      )}
    >
      <section className="dashboard-page">
        {errorMessage ? (
          <div className="workspace-state" role="alert">
            <p className="workspace-state__eyebrow">Data unavailable</p>
            <h2>Unable to load dashboard</h2>
            <p>{errorMessage}</p>
            <div className="workspace-state__actions">
              <button type="button" className="row-action" onClick={() => void refreshDashboard()}>
                Try Again
              </button>
            </div>
          </div>
        ) : null}

        {!errorMessage && isLoading ? (
          <div className="workspace-state">
            <p className="workspace-state__eyebrow">Loading</p>
            <h2>Refreshing operational signals</h2>
            <p>Collecting tasks and schedules.</p>
          </div>
        ) : null}

        {!errorMessage && !isLoading && model ? (
          <>
            <section className="dashboard-block">
              <header className="dashboard-block__header">
                <h3>System Baseline</h3>
                <p>Current enabled coverage and scheduler readiness.</p>
              </header>

              <dl className="dashboard-stats" aria-label="System baseline summary">
                <div>
                  <dt>Tasks</dt>
                  <dd>{model.totals.taskCount}</dd>
                </div>
                <div>
                  <dt>Enabled Tasks</dt>
                  <dd>{model.totals.activeTaskCount}</dd>
                </div>
                <div>
                  <dt>Schedules</dt>
                  <dd>{model.totals.scheduleCount}</dd>
                </div>
                <div>
                  <dt>Enabled Schedules</dt>
                  <dd>{model.totals.activeScheduleCount}</dd>
                </div>
              </dl>
            </section>

            <section className="dashboard-block">
              <header className="dashboard-block__header">
                <h3>Operational Signals</h3>
                <p>Signals that indicate attention demand or degraded automation flow.</p>
              </header>

              <dl className="dashboard-signals" aria-label="Operational signal summary">
                <div>
                  <dt>Tasks in attention queue</dt>
                  <dd>{model.watch.attentionTasks}</dd>
                </div>
                <div>
                  <dt>Healthy active tasks</dt>
                  <dd>{model.watch.healthyTasks}</dd>
                </div>
                <div>
                  <dt>Overdue next runs</dt>
                  <dd>{model.watch.overdueTasks}</dd>
                </div>
                <div>
                  <dt>Tasks without schedule</dt>
                  <dd>{model.watch.missingScheduleTasks}</dd>
                </div>
                <div>
                  <dt>Enabled schedules missing next run</dt>
                  <dd>{model.watch.schedulesWithoutNextRun}</dd>
                </div>
              </dl>
            </section>

            <section className="dashboard-block">
              <header className="dashboard-block__header">
                <h3>Abnormal Task Activity</h3>
                <p>Tasks currently reporting failure, delay, or incomplete scheduling setup.</p>
              </header>

              {model.abnormalities.length === 0 ? (
                <p className="dashboard-empty">No abnormal task signals detected.</p>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th scope="col">Task</th>
                        <th scope="col">Signals</th>
                        <th scope="col">Last Status</th>
                        <th scope="col">Next Run</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.abnormalities.map((item) => (
                        <tr key={item.taskId}>
                          <td>{item.name}</td>
                          <td>{item.signals.join(', ')}</td>
                          <td>
                            <StatusText value={item.lastStatus} />
                          </td>
                          <td>{toDateTimeLabel(item.nextExecutionTime)}</td>
                          <td>
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => navigate(taskPaths.overview(item.taskId))}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="dashboard-block">
              <header className="dashboard-block__header">
                <h3>Upcoming Schedule Queue</h3>
                <p>Nearest planned schedule executions across all tasks.</p>
              </header>

              {model.upcomingSchedules.length === 0 ? (
                <p className="dashboard-empty">No upcoming schedules available.</p>
              ) : (
                <div className="dashboard-table-wrap">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th scope="col">Schedule</th>
                        <th scope="col">Task ID</th>
                        <th scope="col">Next Run</th>
                        <th scope="col">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {model.upcomingSchedules.map((schedule) => (
                        <tr key={schedule.id}>
                          <td>{schedule.name}</td>
                          <td>{schedule.taskId}</td>
                          <td>{toDateTimeLabel(schedule.nextExecutionTime)}</td>
                          <td>
                            <StatusText value={schedule.isActive ? 'Enabled' : 'Disabled'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </TaskLayoutShell>
  )
}
