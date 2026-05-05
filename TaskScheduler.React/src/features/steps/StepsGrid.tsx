import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import DataGrid, {
  Column,
  RowDragging,
  Scrolling,
  Sorting,
  Toolbar,
  Item as ToolbarItem,
} from 'devextreme-react/data-grid'
import type { DataGridRef } from 'devextreme-react/data-grid'
import notify from 'devextreme/ui/notify'
import { createAdminStore, deleteEntity } from '../../api/adminApi'
import { createTaskScopedDataSource } from '../../api/dataSources'
import { StatusBadge } from '../../components/StatusBadge'
import type { Step } from '../../types/entities'

type StepsGridProps = {
  taskId: number
  refreshKey: number
  onCreate: () => void
  onEdit: (step: Step) => void
}

type StepReorderEvent = Parameters<NonNullable<ComponentProps<typeof RowDragging>['onReorder']>>[0]

export function StepsGrid({ taskId, refreshKey, onCreate, onEdit }: StepsGridProps) {
  const gridRef = useRef<DataGridRef<Step, number>>(null)
  const store = useMemo(() => createAdminStore('Steps'), [])
  const dataSource = useMemo(() => createTaskScopedDataSource('Steps', taskId, 'Order'), [taskId])
  const [pendingDeleteStepId, setPendingDeleteStepId] = useState<number | null>(null)

  useEffect(() => {
    setPendingDeleteStepId(null)
    void gridRef.current?.instance().refresh()
  }, [refreshKey, taskId])

  async function handleReorder(event: StepReorderEvent) {
    if (event.fromIndex === event.toIndex) {
      return
    }

    const grid = gridRef.current?.instance()
    const visibleRows = grid?.getVisibleRows() ?? []
    const targetRow = visibleRows[event.toIndex]

    if (!targetRow) {
      return
    }

    const step = event.itemData as Step
    const targetOrder = targetRow.data.Order

    try {
      await store.update(step.Id, { Order: targetOrder })
      await grid?.refresh()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to reorder steps.', 'error', 3500)
    }
  }

  async function handleDelete(step: Step) {
    if (pendingDeleteStepId !== step.Id) {
      setPendingDeleteStepId(step.Id)
      return
    }

    try {
      await deleteEntity('Steps', step.Id)
      setPendingDeleteStepId(null)
      notify('Step deleted.', 'success', 2000)
      await gridRef.current?.instance().refresh()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to delete step.', 'error', 3500)
    }
  }

  function refreshGrid() {
    setPendingDeleteStepId(null)
    void gridRef.current?.instance().refresh()
  }

  return (
    <section className="workspace-view">
      <div className="workspace-view__header">
        <div>
          <p className="workspace-view__eyebrow">Steps</p>
          <h2>Execution Flow</h2>
        </div>
        <div className="workspace-view__actions">
          <button type="button" className="row-action row-action--primary" onClick={onCreate}>
            Add Step
          </button>
        </div>
      </div>

      <div className="workspace-card workspace-card--flush">
        <DataGrid
          ref={gridRef}
          dataSource={dataSource}
          showBorders
          rowAlternationEnabled
          columnAutoWidth
          hoverStateEnabled
          height={520}
          remoteOperations
          noDataText="No steps configured yet."
        >
          <Sorting mode="none" />
          <Scrolling mode="virtual" />
          <RowDragging allowReordering showDragIcons dropFeedbackMode="push" onReorder={handleReorder} />
          <Toolbar>
            <ToolbarItem
              location="after"
              widget="dxButton"
              options={{ icon: 'refresh', hint: 'Refresh steps', onClick: refreshGrid }}
            />
          </Toolbar>

          <Column dataField="Order" caption="Run Order" dataType="number" width={90} allowEditing={false} />
          <Column
            dataField="IsActive"
            caption="Enabled"
            dataType="boolean"
            width={100}
            cellRender={({ value }) => <StatusBadge value={value ? 'Enabled' : 'Disabled'} />}
          />
          <Column dataField="Name" caption="Step Name" minWidth={180} />
          <Column dataField="Description" minWidth={180} />
          <Column dataField="HttpMethod" caption="Method" width={110} />
          <Column dataField="ApiUrl" caption="URL" minWidth={300} />
          <Column
            caption="Actions"
            minWidth={240}
            allowSorting={false}
            allowFiltering={false}
            allowHeaderFiltering={false}
            cellRender={(cell) => {
              const step = cell.data as Step
              const isDeletePending = pendingDeleteStepId === step.Id

              return (
                <div className="row-action-stack">
                  <div className="row-action-group">
                    <button
                      type="button"
                      className="row-action"
                      onClick={(event) => {
                        event.stopPropagation()
                        onEdit(step)
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
                          void handleDelete(step)
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
                            void handleDelete(step)
                          }}
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          className="row-action"
                          onClick={(event) => {
                            event.stopPropagation()
                            setPendingDeleteStepId(null)
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                  {isDeletePending && <div className="inline-warning">Deleting a step reorders the remaining sequence.</div>}
                </div>
              )
            }}
          />
        </DataGrid>
      </div>

      <div className="workspace-note">Open a step to edit headers, body, and run request tests.</div>
    </section>
  )
}