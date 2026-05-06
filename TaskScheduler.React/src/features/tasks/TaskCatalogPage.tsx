import { useEffect, useMemo, useRef, useState } from 'react'
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
import notify from 'devextreme/ui/notify'
import { useNavigate } from 'react-router-dom'
import { createAdminStore, deleteEntity } from '../../api/adminApi'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
import { StatusText } from '../../components/StatusText'
import type { TaskSummary } from '../../types/entities'
import { taskPaths } from './taskRoutes'

type PushableTaskStore = {
  push: (changes: Array<{ type: 'update'; key: number; data: Partial<TaskSummary> }>) => void
}

function isPushableTaskStore(store: unknown): store is PushableTaskStore {
  return Boolean(store && typeof store === 'object' && 'push' in store && typeof store.push === 'function')
}

export function TaskCatalogPage() {
  const gridRef = useRef<DataGridRef<TaskSummary, number>>(null)
  const navigate = useNavigate()
  const tasksStore = useMemo(() => createAdminStore('Tasks'), [])
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<number | null>(null)
  const { lastUpdate } = useTaskUpdatesContext()

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

  async function handleDeleteTask(task: TaskSummary) {
    if (pendingDeleteTaskId !== task.Id) {
      setPendingDeleteTaskId(task.Id)
      return
    }

    try {
      await deleteEntity('Tasks', task.Id)
      setPendingDeleteTaskId(null)
      notify('Task deleted.', 'success', 2000)
      await refreshTasks()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to delete task.', 'error', 3500)
    }
  }

  return (
    <section className="catalog-page">
      <div className="page-toolbar">
        <div>
          <p className="workspace-view__eyebrow">Task Catalog</p>
          <h2>Tasks</h2>
        </div>
        <div className="workspace-view__actions">
          <button type="button" className="row-action row-action--primary" onClick={() => navigate(taskPaths.newTask)}>
            Create Task
          </button>
        </div>
      </div>

      <div className="catalog-panel">
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
          height="calc(100vh - 184px)"
          onRowClick={(event) => {
            if (event.rowType !== 'data') {
              return
            }

            navigate(taskPaths.overview((event.data as TaskSummary).Id))
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
              options={{ icon: 'refresh', hint: 'Refresh tasks', onClick: refreshTasks }}
            />
          </Toolbar>

          <Column dataField="Id" width={70} allowEditing={false} />
          <Column dataField="IsActive" caption="Active" dataType="boolean" width={90} />
          <Column dataField="Name" caption="Task Name" minWidth={220} />
          <Column dataField="Description" minWidth={280} />
          <Column dataField="LastStatus" caption="Status" width={120} allowEditing={false} cellRender={({ value }) => <StatusText value={value} />} />
          <Column dataField="LastExecutionTime" caption="Last Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={150} allowEditing={false} />
          <Column dataField="NextExecutionTime" caption="Next Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={150} allowEditing={false} />
          <Column dataField="UpdatedAt" caption="Last Updated" dataType="datetime" format="dd/MM/yyyy HH:mm" width={160} allowEditing={false} />
          <Column
            caption="Actions"
            minWidth={420}
            allowSorting={false}
            allowFiltering={false}
            allowHeaderFiltering={false}
            cellRender={(cell) => {
              const task = cell.data as TaskSummary
              const isDeletePending = pendingDeleteTaskId === task.Id

              return (
                <div className="row-action-group">
                  <button
                    type="button"
                    className="row-action row-action--primary"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(taskPaths.overview(task.Id))
                    }}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="row-action"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(taskPaths.schedules(task.Id))
                    }}
                  >
                    Schedules
                  </button>
                  <button
                    type="button"
                    className="row-action"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(taskPaths.edit(task.Id))
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="row-action"
                    onClick={(event) => {
                      event.stopPropagation()
                      navigate(taskPaths.history(task.Id))
                    }}
                  >
                    History
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
            }}
          />
        </DataGrid>
      </div>
    </section>
  )
}