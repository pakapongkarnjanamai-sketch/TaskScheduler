import { useState, type PropsWithChildren } from 'react'
import { useTaskUpdates, type TaskUpdatePayload } from './useTaskUpdates'
import { TaskUpdatesContext } from './taskUpdatesContext'

type TaskUpdateEvent = {
  sequence: number
  taskId: number
  payload: TaskUpdatePayload
}

export function TaskUpdatesProvider({ children }: PropsWithChildren) {
  const [lastUpdate, setLastUpdate] = useState<TaskUpdateEvent | null>(null)
  const connectionStatus = useTaskUpdates((taskId, payload) => {
    setLastUpdate((currentValue) => ({
      sequence: (currentValue?.sequence ?? 0) + 1,
      taskId,
      payload,
    }))
  })

  return (
    <TaskUpdatesContext.Provider value={{ connectionStatus, lastUpdate }}>
      {children}
    </TaskUpdatesContext.Provider>
  )
}
