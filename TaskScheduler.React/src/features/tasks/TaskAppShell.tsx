import { NavLink, Outlet } from 'react-router-dom'
import { taskPaths } from './taskRoutes'

export function TaskAppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__top-header">
        <NavLink className="app-shell__home-link" to={taskPaths.catalog}>
          TaskScheduler
        </NavLink>
      </header>

      <main className="app-shell__body app-shell__body--shell">
        <Outlet />
      </main>
    </div>
  )
}