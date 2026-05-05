import { useEffect, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { appConfig } from '../config/appConfig'
import type { TaskSummary } from '../types/entities'

export type TaskUpdatePayload = Partial<Pick<TaskSummary, 'LastStatus' | 'LastExecutionTime' | 'NextExecutionTime'>>
export type TaskHubConnectionStatus = 'Connected' | 'Reconnecting' | 'Disconnected'

const reconnectDelaysMs = [1000, 3000, 5000, 10000]

export function useTaskUpdates(onTaskUpdate: (taskId: number, payload: TaskUpdatePayload) => void) {
  const [connectionStatus, setConnectionStatus] = useState<TaskHubConnectionStatus>('Disconnected')

  useEffect(() => {
    let disposed = false
    let retryAttempt = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let startPromise: Promise<void> | null = null

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(appConfig.hubUrl, { withCredentials: true })
      .withAutomaticReconnect(reconnectDelaysMs)
      .configureLogging(signalR.LogLevel.None)
      .build()

    connection.on('ReceiveTaskUpdate', onTaskUpdate)

    function clearRetryTimer() {
      if (retryTimer === null) {
        return
      }

      clearTimeout(retryTimer)
      retryTimer = null
    }

    function scheduleReconnect() {
      if (disposed || retryTimer !== null) {
        return
      }

      setConnectionStatus('Reconnecting')

      const delayIndex = Math.min(retryAttempt, reconnectDelaysMs.length - 1)
      const retryDelay = reconnectDelaysMs[delayIndex]
      retryAttempt += 1

      retryTimer = setTimeout(() => {
        retryTimer = null
        void startConnection()
      }, retryDelay)
    }

    async function startConnection() {
      if (disposed || startPromise || connection.state !== signalR.HubConnectionState.Disconnected) {
        return
      }

      clearRetryTimer()
      startPromise = connection.start()

      try {
        await startPromise
        retryAttempt = 0
        setConnectionStatus('Connected')
      } catch (error) {
        if (disposed) {
          return
        }

        console.error('Unable to connect to task hub.', error)
        scheduleReconnect()
      } finally {
        startPromise = null
      }
    }

    connection.onreconnecting(() => {
      if (!disposed) {
        setConnectionStatus('Reconnecting')
      }
    })

    connection.onreconnected(() => {
      if (disposed) {
        return
      }

      retryAttempt = 0
      clearRetryTimer()
      setConnectionStatus('Connected')
    })

    connection.onclose((error) => {
      if (disposed) {
        return
      }

      setConnectionStatus('Disconnected')

      if (error) {
        console.warn('Task hub connection closed. Retrying...', error)
      }

      scheduleReconnect()
    })

    void startConnection()

    return () => {
      disposed = true
      clearRetryTimer()
      connection.off('ReceiveTaskUpdate', onTaskUpdate)
      setConnectionStatus('Disconnected')
      connection.stop().catch(() => undefined)
    }
  }, [onTaskUpdate])

  return connectionStatus
}