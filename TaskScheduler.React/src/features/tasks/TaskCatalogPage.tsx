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

  return (
    <section className="catalog-page">
      <div className="page-toolbar">
        <div />
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
          {...catalogDataGridProps}
          onRowClick={(event) => {
            if (event.rowType !== 'data') {
              return
            }

            navigate(taskPaths.overview((event.data as TaskSummary).Id))
          }}
        >
          <Selection mode="single" />
          <FilterRow visible />
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
        </DataGrid>
      </div>
    </section>
  )
}