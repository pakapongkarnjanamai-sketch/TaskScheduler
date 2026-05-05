import { useCallback, useMemo, useRef, useState } from 'react'
import DataGrid, {
  Column,
  FilterRow,
  HeaderFilter,
  Scrolling,
  SearchPanel,
  Selection,
  Toolbar,
  Item as ToolbarItem,
} from 'devextreme-react/data-grid'
import type { DataGridRef } from 'devextreme-react/data-grid'
import Button from 'devextreme-react/button'
import notify from 'devextreme/ui/notify'
import { appConfig } from '../../config/appConfig'
import { createAdminStore, deleteEntity } from '../../api/adminApi'
import { useTaskUpdates, type TaskUpdatePayload } from '../../api/useTaskUpdates'
import { StatusBadge } from '../../components/StatusBadge'
import { ExecutionHistoryView } from '../logs/ExecutionHistoryView'
import { StepLogsView } from '../logs/StepLogsView'
import { ScheduleEditorForm } from '../schedules/ScheduleEditorForm'
import { SchedulesGrid } from '../schedules/SchedulesGrid'
import { StepEditorForm } from '../steps/StepEditorForm'
import { StepsGrid } from '../steps/StepsGrid'
import { TaskEditorForm } from './TaskEditorForm'
import type { Schedule, Step, TaskSummary } from '../../types/entities'

type WorkspaceView = 'empty' | 'overview' | 'task-editor' | 'steps' | 'step-editor' | 'schedules' | 'schedule-editor' | 'history' | 'step-logs'

type PushableTaskStore = {
  push: (changes: Array<{ type: 'update'; key: number; data: TaskUpdatePayload }>) => void
}

function isPushableTaskStore(store: unknown): store is PushableTaskStore {
  return Boolean(store && typeof store === 'object' && 'push' in store && typeof store.push === 'function')
}

export function TaskSchedulerDashboard() {
  const gridRef = useRef<DataGridRef<TaskSummary, number>>(null)
  const tasksStore = useMemo(() => createAdminStore('Tasks'), [])
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null)
  const [activeView, setActiveView] = useState<WorkspaceView>('empty')
  const [taskEditorSeed, setTaskEditorSeed] = useState<TaskSummary | null>(null)
  const [stepEditorSeed, setStepEditorSeed] = useState<Step | null>(null)
  const [scheduleEditorSeed, setScheduleEditorSeed] = useState<Schedule | null>(null)
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<number | null>(null)
  const [stepsRefreshKey, setStepsRefreshKey] = useState(0)
  const [schedulesRefreshKey, setSchedulesRefreshKey] = useState(0)

  const refreshTasks = useCallback(async () => {
    await gridRef.current?.instance().refresh()
  }, [])

  const applyTaskUpdate = useCallback((taskId: number, payload: TaskUpdatePayload) => {
    const grid = gridRef.current?.instance()
    const store = grid?.getDataSource().store()

    if (isPushableTaskStore(store)) {
      store.push([{ type: 'update', key: taskId, data: payload }])
      grid?.repaint()
    } else {
      void refreshTasks()
    }

    setSelectedTask((currentTask) => (currentTask?.Id === taskId ? { ...currentTask, ...payload } : currentTask))
  }, [refreshTasks])

  const taskHubStatus = useTaskUpdates(applyTaskUpdate)

  function openTask(task: TaskSummary, view: Exclude<WorkspaceView, 'empty'> = 'overview') {
    setSelectedTask(task)
    setTaskEditorSeed(view === 'task-editor' ? task : null)
    setStepEditorSeed(null)
    setScheduleEditorSeed(null)
    setPendingDeleteTaskId(null)
    setActiveView(view)
  }

  function openNewTaskEditor() {
    setSelectedTask(null)
    setTaskEditorSeed(null)
    setStepEditorSeed(null)
    setScheduleEditorSeed(null)
    setPendingDeleteTaskId(null)
    setActiveView('task-editor')
  }

  async function handleDeleteTask(task: TaskSummary) {
    if (pendingDeleteTaskId !== task.Id) {
      setPendingDeleteTaskId(task.Id)
      return
    }

    try {
      await deleteEntity('Tasks', task.Id)
      notify('Task deleted.', 'success', 2000)
      setPendingDeleteTaskId(null)

      if (selectedTask?.Id === task.Id) {
        setSelectedTask(null)
        setTaskEditorSeed(null)
        setStepEditorSeed(null)
        setScheduleEditorSeed(null)
        setActiveView('empty')
      }

      await refreshTasks()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to delete task.', 'error', 3500)
    }
  }

  function navigateTo(view: WorkspaceView) {
    setActiveView(view)

    if (view !== 'task-editor') {
      setTaskEditorSeed(null)
    }
    if (view !== 'step-editor') {
      setStepEditorSeed(null)
    }
    if (view !== 'schedule-editor') {
      setScheduleEditorSeed(null)
    }
  }

  function handleTaskSaved(task: TaskSummary) {
    setSelectedTask(task)
    setTaskEditorSeed(null)
    setActiveView('overview')
    void refreshTasks()
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

  function renderTaskOverview(task: TaskSummary) {
    return (
      <section className="workspace-view">
        <div className="workspace-view__header">
          <div>
            <p className="workspace-view__eyebrow">Task Overview</p>
            <h2>{task.Name}</h2>
            <p className="workspace-view__description">{task.Description?.trim() || 'No description has been added for this task yet.'}</p>
          </div>
          <div className="workspace-view__actions">
            <StatusBadge value={task.IsActive ? 'Enabled' : 'Disabled'} />
            <StatusBadge value={task.LastStatus} />
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-metric">
            <span>Last Run</span>
            <strong>{formatDateTime(task.LastExecutionTime, 'Never run')}</strong>
          </div>
          <div className="summary-metric">
            <span>Next Run</span>
            <strong>{formatDateTime(task.NextExecutionTime, 'Not scheduled')}</strong>
          </div>
          <div className="summary-metric">
            <span>Last Status</span>
            <strong>{task.LastStatus || 'Not run'}</strong>
          </div>
          <div className="summary-metric">
            <span>Last Updated</span>
            <strong>{formatDateTime(task.UpdatedAt, 'Not updated')}</strong>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-section__header">
            <div>
              <p className="workspace-view__eyebrow">Operator Flow</p>
              <h3>Choose the next action</h3>
            </div>
          </div>
          <div className="stack-actions">
            <button type="button" className="row-action row-action--primary" onClick={() => openTask(task, 'task-editor')}>
              Edit Task
            </button>
            <button type="button" className="row-action row-action--primary" onClick={() => openTask(task, 'steps')}>
              Manage Steps
            </button>
            <button type="button" className="row-action row-action--primary" onClick={() => openTask(task, 'schedules')}>
              Manage Schedules
            </button>
            <button type="button" className="row-action" onClick={() => openTask(task, 'history')}>
              View Execution History
            </button>
            <button type="button" className="row-action" onClick={() => openTask(task, 'step-logs')}>
              View Step Logs
            </button>
          </div>
        </div>
      </section>
    )
  }

  function renderWorkspaceContent() {
    if (activeView === 'task-editor') {
      return (
        <TaskEditorForm
          task={taskEditorSeed}
          onCancel={() => navigateTo(selectedTask ? 'overview' : 'empty')}
          onSaved={handleTaskSaved}
        />
      )
    }

    if (!selectedTask) {
      return (
        <section className="workspace-empty">
          <p className="workspace-empty__eyebrow">Task Workspace</p>
          <h2>Select a task or start a new one</h2>
          <p>The left pane stays focused on the task list. The right pane is now a full workspace for editing, schedules, steps, and logs.</p>
          <Button text="Create Task" type="default" onClick={openNewTaskEditor} />
        </section>
      )
    }

    if (activeView === 'step-editor') {
      return (
        <StepEditorForm
          task={selectedTask}
          step={stepEditorSeed}
          onCancel={() => navigateTo('steps')}
          onSaved={() => {
            setStepEditorSeed(null)
            setStepsRefreshKey((currentValue) => currentValue + 1)
            navigateTo('steps')
          }}
        />
      )
    }

    if (activeView === 'schedule-editor') {
      return (
        <ScheduleEditorForm
          task={selectedTask}
          schedule={scheduleEditorSeed}
          onCancel={() => navigateTo('schedules')}
          onSaved={() => {
            setScheduleEditorSeed(null)
            setSchedulesRefreshKey((currentValue) => currentValue + 1)
            navigateTo('schedules')
            void refreshTasks()
          }}
        />
      )
    }

    return (
      <>
        <section className="task-context-card">
          <div>
            <p className="workspace-view__eyebrow">Selected Task</p>
            <h2>{selectedTask.Name}</h2>
            <p className="workspace-view__description">{selectedTask.Description?.trim() || 'No description has been added for this task yet.'}</p>
          </div>
          <div className="task-context-card__badges">
            <StatusBadge value={selectedTask.IsActive ? 'Enabled' : 'Disabled'} />
            <StatusBadge value={selectedTask.LastStatus} />
          </div>
        </section>

        <nav className="workspace-nav" aria-label="Task workspace navigation">
          <button type="button" className={activeView === 'overview' ? 'workspace-nav__button workspace-nav__button--active' : 'workspace-nav__button'} onClick={() => navigateTo('overview')}>
            Overview
          </button>
          <button type="button" className={activeView === 'steps' ? 'workspace-nav__button workspace-nav__button--active' : 'workspace-nav__button'} onClick={() => navigateTo('steps')}>
            Steps
          </button>
          <button type="button" className={activeView === 'schedules' ? 'workspace-nav__button workspace-nav__button--active' : 'workspace-nav__button'} onClick={() => navigateTo('schedules')}>
            Schedules
          </button>
          <button type="button" className={activeView === 'history' ? 'workspace-nav__button workspace-nav__button--active' : 'workspace-nav__button'} onClick={() => navigateTo('history')}>
            Execution History
          </button>
          <button type="button" className={activeView === 'step-logs' ? 'workspace-nav__button workspace-nav__button--active' : 'workspace-nav__button'} onClick={() => navigateTo('step-logs')}>
            Step Logs
          </button>
          <button type="button" className="workspace-nav__button" onClick={() => openTask(selectedTask, 'task-editor')}>
            Edit Task
          </button>
        </nav>

        {activeView === 'overview' && renderTaskOverview(selectedTask)}
        {activeView === 'steps' && (
          <StepsGrid
            taskId={selectedTask.Id}
            refreshKey={stepsRefreshKey}
            onCreate={() => {
              setStepEditorSeed(null)
              navigateTo('step-editor')
            }}
            onEdit={(step) => {
              setStepEditorSeed(step)
              navigateTo('step-editor')
            }}
          />
        )}
        {activeView === 'schedules' && (
          <SchedulesGrid
            taskId={selectedTask.Id}
            refreshKey={schedulesRefreshKey}
            onCreate={() => {
              setScheduleEditorSeed(null)
              navigateTo('schedule-editor')
            }}
            onEdit={(schedule) => {
              setScheduleEditorSeed(schedule)
              navigateTo('schedule-editor')
            }}
            onChanged={() => {
              void refreshTasks()
            }}
          />
        )}
        {activeView === 'history' && <ExecutionHistoryView task={selectedTask} />}
        {activeView === 'step-logs' && <StepLogsView task={selectedTask} />}
      </>
    )
  }

  return (
    <div className="dashboard">
      <header className="app-header">
        <div>
          <p className="eyebrow">TaskScheduler React</p>
          <h1>Operational Task Console</h1>
        </div>
        <div className="header-chips">
          <div className="connection-chip">
            <span className="connection-chip__label">SignalR</span>
            <StatusBadge value={taskHubStatus} />
          </div>
          <div className="api-chip">API {appConfig.apiBaseUrl}</div>
        </div>
      </header>

      <section className="workspace-layout">
        <aside className="workspace-sidebar">
          <div className="workspace-sidebar__header">
            <div>
              <p className="workspace-view__eyebrow">Task Catalog</p>
              <h2>Tasks</h2>
            </div>
            <Button text="New Task" type="default" onClick={openNewTaskEditor} />
          </div>

          <div className="workspace-card workspace-card--flush">
        <DataGrid
          ref={gridRef}
          dataSource={tasksStore}
          showBorders
          rowAlternationEnabled
          repaintChangesOnly
          columnAutoWidth
          wordWrapEnabled
          hoverStateEnabled
          remoteOperations
          height="calc(100vh - 242px)"
          selectedRowKeys={selectedTask ? [selectedTask.Id] : []}
          onRowClick={(event) => {
            if (event.rowType !== 'data') {
              return
            }

            openTask(event.data as TaskSummary)
          }}
        >
          <Selection mode="single" />
          <SearchPanel visible width={280} placeholder="Search tasks..." />
          <FilterRow visible />
          <HeaderFilter visible />
          <Scrolling mode="virtual" />
          <Toolbar>
            <ToolbarItem name="searchPanel" />
            <ToolbarItem
              location="after"
              widget="dxButton"
              options={{ icon: 'refresh', hint: 'Refresh', onClick: refreshTasks }}
            />
          </Toolbar>

          <Column dataField="Id" width={70} allowEditing={false} />
          <Column dataField="IsActive" caption="Active" dataType="boolean" width={90} />
          <Column dataField="Name" caption="Task Name" minWidth={200} />
          <Column dataField="Description" minWidth={260} />
          <Column dataField="LastStatus" caption="Status" width={120} allowEditing={false} cellRender={({ value }) => <StatusBadge value={value} />} />
          <Column dataField="LastExecutionTime" caption="Last Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={150} allowEditing={false} />
          <Column dataField="NextExecutionTime" caption="Next Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={150} allowEditing={false} />
          <Column dataField="UpdatedAt" caption="Last Updated" dataType="datetime" format="dd/MM/yyyy HH:mm" width={160} allowEditing={false} />
          <Column caption="Actions" minWidth={340} allowSorting={false} cellRender={(cell) => {
            const task = cell.data as TaskSummary
            const isDeletePending = pendingDeleteTaskId === task.Id

            return (
              <div className="row-action-group">
                <button
                  type="button"
                  className="row-action row-action--primary"
                  onClick={(event) => {
                    event.stopPropagation()
                    openTask(task, 'overview')
                  }}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="row-action"
                  onClick={(event) => {
                    event.stopPropagation()
                    openTask(task, 'task-editor')
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="row-action"
                  onClick={(event) => {
                    event.stopPropagation()
                    openTask(task, 'history')
                  }}
                >
                  History
                </button>
                <button
                  type="button"
                  className="row-action"
                  onClick={(event) => {
                    event.stopPropagation()
                    openTask(task, 'step-logs')
                  }}
                >
                  Step Logs
                </button>
                <button
                  type="button"
                  className={isDeletePending ? 'row-action row-action--danger' : 'row-action'}
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleDeleteTask(task)
                  }}
                >
                  {isDeletePending ? 'Confirm delete' : 'Delete'}
                </button>
                {isDeletePending && (
                  <button
                    type="button"
                    className="row-action"
                    onClick={(event) => {
                      event.stopPropagation()
                      setPendingDeleteTaskId(null)
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )
          }} />
        </DataGrid>
          </div>
        </aside>

        <main className="workspace-main">
          {renderWorkspaceContent()}
        </main>
      </section>
    </div>
  )
}