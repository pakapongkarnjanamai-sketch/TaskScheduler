import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { appConfig } from '../config/appConfig'
import type { TaskSummary } from '../types/entities'

export type TaskUpdatePayload = Partial<Pick<TaskSummary, 'LastStatus' | 'LastExecutionTime' | 'NextExecutionTime'>>
export type TaskHubConnectionStatus = 'Connected' | 'Reconnecting' | 'Disconnected'

// Delays used both for initial-connect retry and for withAutomaticReconnect
const retryDelaysMs = [1000, 3000, 5000, 10000, 30000]
const connectErrorLogThrottleMs = 30000

export function useTaskUpdates(onTaskUpdate: (taskId: number, payload: TaskUpdatePayload) => void) {
  const [connectionStatus, setConnectionStatus] = useState<TaskHubConnectionStatus>('Disconnected')
  const lastConnectErrorLoggedAtRef = useRef(0)
  const onTaskUpdateRef = useRef(onTaskUpdate)

  useEffect(() => {
    onTaskUpdateRef.current = onTaskUpdate
  }, [onTaskUpdate])

  useEffect(() => {
    let disposed = false

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(appConfig.hubUrl, { withCredentials: true })
      // Infinite retry policy — returns a delay for every attempt, never gives up
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) =>
          retryDelaysMs[Math.min(ctx.previousRetryCount, retryDelaysMs.length - 1)],
      })
      .configureLogging(signalR.LogLevel.None)
      .build()

    // Route messages through a ref so the closure never goes stale
    connection.on('ReceiveTaskUpdate', (taskId: number, payload: TaskUpdatePayload) => {
      onTaskUpdateRef.current(taskId, payload)
    })

    connection.onreconnecting(() => {
      if (!disposed) {
        setConnectionStatus('Reconnecting')
      }
    })

    connection.onreconnected(() => {
      if (disposed) {
        return
      }

      setConnectionStatus('Connected')
    })

    // onclose only fires on explicit stop() or when the infinite retry policy is exhausted (never).
    connection.onclose(() => {
      if (disposed) {
        return
      }

      setConnectionStatus('Disconnected')
    })

    // withAutomaticReconnect only covers reconnects after a successful connect.
    // For the initial connection we handle retries ourselves with a simple backoff.
    let retryCount = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function scheduleInitialConnect() {
      if (disposed) return
      const delay = retryDelaysMs[Math.min(retryCount, retryDelaysMs.length - 1)]
      retryCount += 1
      retryTimer = setTimeout(() => {
        retryTimer = null
        void connect()
      }, delay)
    }

    async function connect() {
      if (disposed || connection.state !== signalR.HubConnectionState.Disconnected) return
      try {
        await connection.start()
        if (!disposed) {
          retryCount = 0
          setConnectionStatus('Connected')
        }
      } catch (error) {
        if (!disposed) {
          setConnectionStatus('Disconnected')

          const now = Date.now()
          if (now - lastConnectErrorLoggedAtRef.current >= connectErrorLogThrottleMs) {
            lastConnectErrorLoggedAtRef.current = now
            console.warn('Unable to connect to task hub, retrying with backoff.', error)
          }

          scheduleInitialConnect()
        }
      }
    }

    void connect()

    return () => {
      disposed = true
      if (retryTimer !== null) {
        clearTimeout(retryTimer)
      }
      connection.stop().catch(() => undefined)
    }
  }, []) // empty deps — connection is created once for the lifetime of the provider

  return connectionStatus
}