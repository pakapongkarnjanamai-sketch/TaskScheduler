import { useEffect, useMemo, useRef } from 'react'
import DataGrid, {
  Column,
  FilterRow,
  Scrolling,
  Selection,
} from 'devextreme-react/data-grid'
import type { DataGridRef } from 'devextreme-react/data-grid'
import { useNavigate } from 'react-router-dom'
import { createAdminStore } from '../../api/adminApi'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
import { catalogDataGridProps, standardVirtualScrollingProps } from '../../components/grid/dataGridConfig'
import { ensureDevExtremeConfigured } from '../../config/devExtremeSetup'
import { StatusText } from '../../components/StatusText'
import type { TaskSummary } from '../../types/entities'
import { TaskLayoutShell } from './TaskLayoutShell'
import { taskPaths } from './taskRoutes'

ensureDevExtremeConfigured()

type PushableTaskStore = {
  push: (changes: Array<{ type: 'update'; key: number; data: Partial<TaskSummary> }>) => void
}

function getFilterEditorAriaLabel(dataField?: string) {
  switch (dataField) {
    case 'Id':
      return 'Filter by task ID'
    case 'IsActive':
      return 'Filter by enabled status'
    case 'Name':
      return 'Filter by task name'
    case 'Description':
      return 'Filter by task description'
    case 'LastStatus':
      return 'Filter by last status'
    case 'LastExecutionTime':
      return 'Filter by last run time'
    case 'NextExecutionTime':
      return 'Filter by next run time'
    case 'UpdatedAt':
      return 'Filter by last updated time'
    default:
      return 'Filter tasks'
  }
}

function isPushableTaskStore(store: unknown): store is PushableTaskStore {
  return Boolean(store && typeof store === 'object' && 'push' in store && typeof store.push === 'function')
}

export function TaskCatalogPage() {
  const gridRef = useRef<DataGridRef<TaskSummary, number>>(null)
  const navigate = useNavigate()
  const tasksStore = useMemo(() => createAdminStore('Tasks'), [])
  const { lastUpdate } = useTaskUpdatesContext()

  function openTaskWorkspace(task: TaskSummary) {
    navigate(taskPaths.overview(task.Id))
  }

  async function refreshTasks() {
    await gridRef.current?.instance().refresh()
  }

  useEffect(() => {
    if (!lastUpdate) {
      return
    }

    const grid = gridRef.current?.instance()
    const store = grid?.getDataSource().store()

    if (isPushableTaskStore(store)) {
      store.push([{ type: 'update', key: lastUpdate.taskId, data: lastUpdate.payload }])
      grid?.repaint()
      return
    }

    void refreshTasks()
  }, [lastUpdate])

  return (
    <TaskLayoutShell
      sidebar={{
        label: 'Main Navigation',
        ariaLabel: 'Main navigation',
        items: [
          { key: 'dashboard', label: 'Dashboard', to: taskPaths.dashboard, end: true },
          { key: 'catalog', label: 'Task Catalog', to: taskPaths.catalog, end: true },
        ],
      }}
      title="Task Catalog"
      description="Review tasks, open a workspace, or start a new setup flow."
      showTopBar={false}
      headerContent={(
        <div className="workspace-view__actions">
          <button type="button" className="row-action row-action--primary" onClick={() => navigate(taskPaths.newTask)}>
            Create Task
          </button>
        </div>
      )}
    >
      <section className="catalog-page">
        <div className="catalog-panel">
          <DataGrid
            ref={gridRef}
            dataSource={tasksStore}
            {...catalogDataGridProps}
            onRowDblClick={(event) => {
              if (event.rowType !== 'data') {
                return
              }

              openTaskWorkspace(event.data as TaskSummary)
            }}
            onEditorPreparing={(event) => {
              if (event.parentType !== 'filterRow') {
                return
              }

              event.editorOptions = {
                ...event.editorOptions,
                inputAttr: {
                  ...(event.editorOptions?.inputAttr ?? {}),
                  'aria-label': getFilterEditorAriaLabel(event.dataField),
                },
              }
            }}
          >
            <Selection mode="single" />
            <FilterRow visible applyFilter="auto" showOperationChooser={false} />
            <Scrolling {...standardVirtualScrollingProps} />

            <Column dataField="Id" width={70} allowEditing={false} />
            <Column
              dataField="IsActive"
              caption="Enabled"
              dataType="boolean"
              width={100}
              cellRender={({ value }) => <StatusText value={value ? 'Enabled' : 'Disabled'} />}
            />
            <Column dataField="Name" caption="Task Name" minWidth={220} />
            <Column dataField="Description" minWidth={280} />
            <Column dataField="LastStatus" caption="Status" width={120} allowEditing={false} cellRender={({ value }) => <StatusText value={value} />} />
            <Column dataField="LastExecutionTime" caption="Last Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={150} allowEditing={false} />
            <Column dataField="NextExecutionTime" caption="Next Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={150} allowEditing={false} />
            <Column dataField="UpdatedAt" caption="Last Updated" dataType="datetime" format="dd/MM/yyyy HH:mm" width={160} allowEditing={false} />
            <Column
              caption="Actions"
              width={120}
              allowSorting={false}
              allowFiltering={false}
              allowHeaderFiltering={false}
              cellRender={(cell) => {
                const task = cell.data as TaskSummary

                if (!task) {
                  return null
                }

                return (
                  <div className="row-action-stack row-action-stack--right">
                    <div className="row-action-group">
                      <button
                        type="button"
                        className="row-action"
                        onClick={(event) => {
                          event.stopPropagation()
                          openTaskWorkspace(task)
                        }}
                      >
                        Open
                      </button>
                    </div>
                  </div>
                )
              }}
            />
          </DataGrid>
        </div>
      </section>
    </TaskLayoutShell>
  )
}