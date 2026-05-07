import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadDashboardSummary } from '../../api/adminApi'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
import { StatusText } from '../../components/StatusText'
import type { DashboardScheduleQueueItem, DashboardSummary } from '../../types/entities'
import { TaskLayoutShell } from './TaskLayoutShell'
import { taskPaths } from './taskRoutes'

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

function hasSuccessStatus(value?: string | null) {
  if (!value) {
    return false
  }

  const loweredValue = value.toLowerCase()
  return loweredValue.includes('success') || loweredValue.includes('completed')
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

function toTriggerLabel(item: DashboardScheduleQueueItem) {
  if (item.triggerType === 'Interval') {
    return item.intervalTime ? `Every ${item.intervalTime} minute(s)` : 'Interval'
  }

  if (item.triggerType === 'Daily') {
    return item.startTime ? `Daily at ${item.startTime}` : 'Daily'
  }

  if (item.triggerType === 'Weekly') {
    const days = item.daysOfWeek || 'No weekday'
    const atTime = item.startTime ? ` at ${item.startTime}` : ''
    return `${days}${atTime}`
  }

  if (item.triggerType === 'Monthly') {
    const day = item.dayOfMonth ? `Day ${item.dayOfMonth}` : 'Day ?'
    const atTime = item.startTime ? ` at ${item.startTime}` : ''
    return `${day}${atTime}`
  }

  return item.triggerType
}

function getScheduleCardTone(item: DashboardScheduleQueueItem): 'success' | 'running' | 'failed' | 'disabled' | 'neutral' {
  if (!item.isActive || !item.taskIsActive) {
    return 'disabled'
  }

  if (hasFailureStatus(item.taskLastStatus) || isOverdue(item.nextExecutionTime)) {
    return 'failed'
  }

  if (hasRunningStatus(item.taskLastStatus)) {
    return 'running'
  }

  if (hasSuccessStatus(item.taskLastStatus)) {
    return 'success'
  }

  return 'neutral'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { lastUpdate } = useTaskUpdatesContext()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const data = await loadDashboardSummary()
      setSummary(data)
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
      description="Upcoming schedule queue with detailed cards and abnormal task visibility."
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
            <h2>Refreshing dashboard queue</h2>
            <p>Collecting summary payload from API.</p>
          </div>
        ) : null}

        {!errorMessage && !isLoading && summary ? (
          <>
            <section className="dashboard-block">
              <header className="dashboard-block__header">
                <h3>Upcoming Schedule Queue</h3>
                <p>Schedule cards are ordered by next execution time and include task and trigger details.</p>
              </header>

              {summary.scheduleQueue.length === 0 ? (
                <p className="dashboard-empty">No schedules available in queue.</p>
              ) : (
                <ol className="dashboard-queue-list">
                  {summary.scheduleQueue.map((item, index) => (
                    <li key={item.scheduleId}>
                      <article className={`dashboard-queue-card dashboard-queue-card--${getScheduleCardTone(item)}`}>
                        <header className="dashboard-queue-card__head">
                          <div className="dashboard-queue-card__title-block">
                            <p className="dashboard-queue-card__index">Queue {index + 1}</p>
                            <h4>{item.scheduleName}</h4>
                            {item.scheduleDescription ? <p className="dashboard-queue-card__subtitle">{item.scheduleDescription}</p> : null}
                          </div>
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => navigate(taskPaths.overview(item.taskId))}
                          >
                            Open Task
                          </button>
                        </header>

                        <p className="dashboard-queue-card__line">
                          <span>Task</span>
                          <strong>{item.taskName} (#{item.taskId})</strong>
                        </p>
                        <p className="dashboard-queue-card__line">
                          <span>Trigger</span>
                          <strong>{toTriggerLabel(item)}</strong>
                        </p>
                        <p className="dashboard-queue-card__line">
                          <span>Next run</span>
                          <strong>{toDateTimeLabel(item.nextExecutionTime)}</strong>
                        </p>
                        <p className="dashboard-queue-card__line">
                          <span>Last run</span>
                          <strong>{toDateTimeLabel(item.taskLastExecutionTime)}</strong>
                        </p>
                        <p className="dashboard-queue-card__line">
                          <span>Task status</span>
                          <StatusText value={item.taskLastStatus} />
                        </p>
                        <p className="dashboard-queue-card__line">
                          <span>Schedule state</span>
                          <StatusText value={item.isActive ? 'Enabled' : 'Disabled'} />
                        </p>
                      </article>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="dashboard-block">
              <header className="dashboard-block__header">
                <h3>Abnormal Task Activity</h3>
                <p>Tasks reporting failure, delay, disabled status, or incomplete schedule setup.</p>
              </header>

              {summary.abnormalTasks.length === 0 ? (
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
                      {summary.abnormalTasks.map((task) => (
                        <tr key={task.taskId}>
                          <td>{task.taskName}</td>
                          <td>{task.signals.join(', ')}</td>
                          <td>
                            <StatusText value={task.lastStatus} />
                          </td>
                          <td>{toDateTimeLabel(task.nextExecutionTime)}</td>
                          <td>
                            <button
                              type="button"
                              className="row-action"
                              onClick={() => navigate(taskPaths.overview(task.taskId))}
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
          </>
        ) : null}
      </section>
    </TaskLayoutShell>
  )
}
