import { useEffect, useId, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  applyTheme,
  persistTheme,
  readDocumentTheme,
  resolveInitialTheme,
  type ThemeMode,
} from '../../config/theme'
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
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {connectionStatus}
    </span>
  )
}

export function TaskAppShell() {
  const themeToggleId = useId()
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readDocumentTheme() ?? resolveInitialTheme())
  const isDarkTheme = themeMode === 'dark'

  useEffect(() => {
    applyTheme(themeMode)
    persistTheme(themeMode)
  }, [themeMode])

  return (
    <div className="app-shell">
      <a className="app-shell__skip-link" href="#task-app-main-content">
        Skip to main content
      </a>

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
          <label className="app-shell__theme-toggle" htmlFor={themeToggleId}>
            <span className="app-shell__theme-toggle-label">Dark</span>
            <input
              id={themeToggleId}
              className="app-shell__theme-toggle-input"
              type="checkbox"
              role="switch"
              aria-label="Use dark theme"
              aria-checked={isDarkTheme}
              checked={isDarkTheme}
              onChange={(event) => {
                setThemeMode(event.target.checked ? 'dark' : 'light')
              }}
            />
          </label>
          <ConnectionStatus />
        </div>
      </header>

      <main id="task-app-main-content" className="app-shell__body app-shell__body--shell" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}