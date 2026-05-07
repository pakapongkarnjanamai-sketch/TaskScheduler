import { NavLink, Outlet } from 'react-router-dom'
import { useTaskUpdatesContext } from '../../api/taskUpdatesContext'
import { taskPaths } from './taskRoutes'

function ConnectionStatus() {
  const { connectionStatus } = useTaskUpdatesContext()
  return (
    <span
      className={[
        'app-shell__connection-status',
        connectionStatus !== 'Connected' ? `app-shell__connection-status--${connectionStatus.toLowerCase()}` : '',
      ].filter(Boolean).join(' ')}
    >
      {connectionStatus}
    </span>
  )
}

export function TaskAppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__top-header">
        <NavLink className="app-shell__home-link" to={taskPaths.catalog}>
          TaskScheduler
        </NavLink>
        <div className="app-shell__header-end">
          <ConnectionStatus />
        </div>
      </header>

      <main className="app-shell__body app-shell__body--shell">
        <Outlet />
      </main>
    </div>
  )
}