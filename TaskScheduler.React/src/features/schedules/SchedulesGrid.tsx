import { useMemo, useRef, useState } from 'react'
import DataGrid, {
  Column,
  ColumnFixing,
  Scrolling,
} from 'devextreme-react/data-grid'
import type { DataGridRef } from 'devextreme-react/data-grid'
import notify from 'devextreme/ui/notify'
import { createTaskScopedDataSource } from '../../api/dataSources'
import { deleteEntity } from '../../api/adminApi'
import { fixedActionColumnProps, standardVirtualScrollingProps, workspaceDataGridProps } from '../../components/grid/dataGridConfig'
import { StatusText } from '../../components/StatusText'
import type { Schedule } from '../../types/entities'
import { buildScheduleSummary } from './scheduleRules'

type SchedulesGridProps = {
  taskId: number
  refreshKey: number
  onCreate: () => void
  onEdit: (schedule: Schedule) => void
  onChanged: () => void
}

export function SchedulesGrid({ taskId, onEdit, onChanged }: SchedulesGridProps) {
  const gridRef = useRef<DataGridRef<Schedule, number>>(null)
  const dataSource = useMemo(() => createTaskScopedDataSource('Schedules', taskId), [taskId])
  const [pendingDeleteScheduleId, setPendingDeleteScheduleId] = useState<number | null>(null)

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

  return (
    <section className="workspace-view">
      <div className="workspace-card workspace-card--flush">
        <DataGrid
          ref={gridRef}
          dataSource={dataSource}
          {...workspaceDataGridProps}
          noDataText="No schedules configured yet."
        >
          <ColumnFixing enabled={true} />
          <Scrolling {...standardVirtualScrollingProps} />

          <Column dataField="Name" caption="Schedule" minWidth={160} />
          <Column dataField="Description" minWidth={150} />
          <Column
            dataField="IsActive"
            caption="Enabled"
            dataType="boolean"
            width={100}
            cellRender={({ value }) => <StatusText value={value ? 'Enabled' : 'Disabled'} />}
          />
          <Column dataField="TriggerType" caption="Pattern" width={120} />
          <Column caption="Recurrence" minWidth={200} calculateCellValue={(schedule: Schedule) => buildScheduleSummary(schedule)} />
          <Column dataField="NextExecutionTime" caption="Next Run" dataType="datetime" format="dd/MM/yyyy HH:mm" width={140} />
          <Column
            {...fixedActionColumnProps}
            cellRender={(cell) => {
              const schedule = cell.data as Schedule
              const isDeletePending = pendingDeleteScheduleId === schedule.Id

              return (
                <div className="row-action-stack row-action-stack--right">
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
                          Confirm Delete
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
                </div>
              )
            }}
          />
        </DataGrid>
      </div>
    </section>
  )
}