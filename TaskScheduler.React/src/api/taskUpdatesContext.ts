import { createContext, useContext } from 'react'
import type { TaskHubConnectionStatus, TaskUpdatePayload } from './useTaskUpdates'

type TaskUpdateEvent = {
  sequence: number
  taskId: number
  payload: TaskUpdatePayload
}

type TaskUpdatesContextValue = {
  connectionStatus: TaskHubConnectionStatus
  lastUpdate: TaskUpdateEvent | null
}

export const TaskUpdatesContext = createContext<TaskUpdatesContextValue | null>(null)

export function useTaskUpdatesContext() {
  const context = useContext(TaskUpdatesContext)

  if (!context) {
    throw new Error('useTaskUpdatesContext must be used within a TaskUpdatesProvider.')
  }

  return context
}