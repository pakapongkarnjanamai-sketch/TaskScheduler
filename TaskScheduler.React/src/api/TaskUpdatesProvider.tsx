import { useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'
import { useTaskUpdates, type TaskUpdatePayload } from './useTaskUpdates'
import { TaskUpdatesContext } from './taskUpdatesContext'

type TaskUpdateEvent = {
  sequence: number
  taskId: number
  payload: TaskUpdatePayload
}

type ConnectedTaskUpdatesProviderProps = PropsWithChildren<{
  lastUpdate: TaskUpdateEvent | null
  setLastUpdate: Dispatch<SetStateAction<TaskUpdateEvent | null>>
}>

function ConnectedTaskUpdatesProvider({ children, lastUpdate, setLastUpdate }: ConnectedTaskUpdatesProviderProps) {
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

export function TaskUpdatesProvider({ children }: PropsWithChildren) {
  const location = useLocation()
  const [lastUpdate, setLastUpdate] = useState<TaskUpdateEvent | null>(null)

  if (location.pathname === '/tasks/new') {
    return (
      <TaskUpdatesContext.Provider value={{ connectionStatus: 'Disconnected', lastUpdate }}>
        {children}
      </TaskUpdatesContext.Provider>
    )
  }

  return (
    <ConnectedTaskUpdatesProvider lastUpdate={lastUpdate} setLastUpdate={setLastUpdate}>
      {children}
    </ConnectedTaskUpdatesProvider>
  )
}
