import { Outlet } from 'react-router-dom'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
import { StatusText } from '../../components/StatusText'
import { appConfig } from '../../config/appConfig'

export function TaskAppShell() {
  const { connectionStatus } = useTaskUpdatesContext()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title-block">
          <span className="app-title">TaskScheduler</span>
        </div>
        <dl className="app-meta">
          <div className="app-meta__item">
            <dt>SignalR</dt>
            <dd><StatusText value={connectionStatus} /></dd>
          </div>
          <div className="app-meta__item">
            <dt>API</dt>
            <dd>{appConfig.apiBaseUrl}</dd>
          </div>
        </dl>
      </header>

      <main className="app-shell__body">
        <Outlet />
      </main>
    </div>
  )
}