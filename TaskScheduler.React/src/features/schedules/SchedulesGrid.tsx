import { useEffect, useMemo, useRef, useState } from 'react'
import DataGrid, {
  Column,
  Scrolling,
  Toolbar,
  Item as ToolbarItem,
} from 'devextreme-react/data-grid'
import type { DataGridRef } from 'devextreme-react/data-grid'
import notify from 'devextreme/ui/notify'
import { createTaskScopedDataSource } from '../../api/dataSources'
import { deleteEntity } from '../../api/adminApi'
import { StatusBadge } from '../../components/StatusBadge'
import type { Schedule } from '../../types/entities'
import { buildScheduleSummary } from './scheduleRules'

type SchedulesGridProps = {
  taskId: number
  refreshKey: number
  onCreate: () => void
  onEdit: (schedule: Schedule) => void
  onChanged: () => void
}

export function SchedulesGrid({ taskId, refreshKey, onCreate, onEdit, onChanged }: SchedulesGridProps) {
  const gridRef = useRef<DataGridRef<Schedule, number>>(null)
  const dataSource = useMemo(() => createTaskScopedDataSource('Schedules', taskId), [taskId])
  const [pendingDeleteScheduleId, setPendingDeleteScheduleId] = useState<number | null>(null)

  useEffect(() => {
    setPendingDeleteScheduleId(null)
    void gridRef.current?.instance().refresh()
  }, [refreshKey, taskId])

  async function removeSchedule(schedule: Schedule) {
    if (pendingDeleteScheduleId !== schedule.Id) {
      setPendingDeleteScheduleId(schedule.Id)
      return
    }

    try {
      await deleteEntity('Schedules', schedule.Id)
      setPendingDeleteScheduleId(null)
      notify('Schedule deleted.', 'success', 2000)
      await gridRef.current?.instance().refresh()
      onChanged()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to delete schedule.', 'error', 3500)
    }
  }

  async function refreshGrid() {
    await gridRef.current?.instance().refresh()
  }

  return (
    <section className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <p className="workspace-view__eyebrow">Schedules</p>
          <h2>Run Patterns</h2>
        </div>
      </div>

      <div className="workspace-card workspace-card--flush">
        <DataGrid
          ref={gridRef}
          dataSource={dataSource}
          showBorders
          rowAlternationEnabled
          columnAutoWidth
          wordWrapEnabled
          hoverStateEnabled
          height={520}
          noDataText="No schedules configured yet."
        >
          <Scrolling mode="virtual" />
          <Toolbar>
            <ToolbarItem
              location="after"
              widget="dxButton"
              options={{ icon: 'refresh', hint: 'Refresh schedules', onClick: refreshGrid }}
            />
            <ToolbarItem
              location="after"
              widget="dxButton"
              options={{ icon: 'event', text: 'Add Schedule', type: 'default', onClick: onCreate }}
            />
          </Toolbar>

          <Column dataField="Name" caption="Schedule" minWidth={180} />
          <Column dataField="Description" minWidth={180} />
          <Column
            dataField="IsActive"
            caption="Enabled"
            dataType="boolean"
            width={100}
            cellRender={({ value }) => <StatusBadge value={value ? 'Enabled' : 'Disabled'} />}
          />
          <Column dataField="TriggerType" caption="Pattern" width={120} />
          <Column caption="Recurrence" minWidth={240} calculateCellValue={(schedule: Schedule) => buildScheduleSummary(schedule)} />
          <Column dataField="NextExecutionTime" caption="Next Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={160} />
          <Column
            caption="Actions"
            minWidth={240}
            allowSorting={false}
            allowFiltering={false}
            allowHeaderFiltering={false}
            cellRender={(cell) => {
              const schedule = cell.data as Schedule
              const isDeletePending = pendingDeleteScheduleId === schedule.Id

              return (
                <div className="row-action-stack">
                  <div className="row-action-group">
                    <button
                      type="button"
                      className="row-action"
                      onClick={(event) => {
                        event.stopPropagation()
                        onEdit(schedule)
                      }}
                    >
                      Edit
                    </button>
                    {!isDeletePending && (
                      <button
                        type="button"
                        className="row-action row-action--danger"
                        onClick={(event) => {
                          event.stopPropagation()
                          void removeSchedule(schedule)
                        }}
                      >
                        Delete
                      </button>
                    )}
                    {isDeletePending && (
                      <>
                        <button
                          type="button"
                          className="row-action row-action--confirm"
                          onClick={(event) => {
                            event.stopPropagation()
                            void removeSchedule(schedule)
                          }}
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          className="row-action"
                          onClick={(event) => {
                            event.stopPropagation()
                            setPendingDeleteScheduleId(null)
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                  {isDeletePending && <div className="inline-warning">Deleting a schedule does not remove execution history.</div>}
                </div>
              )
            }}
          />
        </DataGrid>
      </div>
    </section>
  )
}