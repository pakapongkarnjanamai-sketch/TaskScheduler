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
        <NavLink className="app-shell__home-link" to={taskPaths.dashboard}>
          <span className="app-shell__brand-icon" aria-hidden="true">
            <svg viewBox="0 0 16 16" focusable="false">
              <rect x="1" y="1" width="14" height="14" rx="2" />
              <path d="M4 8h2l1-2 2 4 1-2h2" />
            </svg>
          </span>
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