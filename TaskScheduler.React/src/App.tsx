import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { TaskUpdatesProvider } from './api/TaskUpdatesProvider'
import { TaskAppShell } from './features/tasks/TaskAppShell'
import { taskPaths } from './features/tasks/taskRoutes'

const TaskCatalogPage = lazy(async () => {
  const module = await import('./features/tasks/TaskCatalogPage')
  return { default: module.TaskCatalogPage }
})

const DashboardPage = lazy(async () => {
  const module = await import('./features/tasks/DashboardPage')
  return { default: module.DashboardPage }
})

const TaskCreatePage = lazy(async () => {
  const module = await import('./features/tasks/TaskCreatePage')
  return { default: module.TaskCreatePage }
})

const TaskWorkspacePage = lazy(async () => {
  const module = await import('./features/tasks/TaskWorkspacePage')
  return { default: module.TaskWorkspacePage }
})

function RouteLoadingFallback() {
  return (
    <div className="route-loading" role="status" aria-live="polite" aria-atomic="true">
      <p>Loading page...</p>
    </div>
  )
}

function normalizeRouterBasePath(value: string | undefined) {
  const trimmedValue = value?.trim()

  if (!trimmedValue || trimmedValue === '/') {
    return '/'
  }

  const withLeadingSlash = trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash
}

const routerBasePath = normalizeRouterBasePath(import.meta.env.VITE_TASKSCHEDULER_APP_BASE_PATH)
const routeLoadingFallback = <RouteLoadingFallback />

function App() {
  return (
    <BrowserRouter basename={routerBasePath}>
      <TaskUpdatesProvider>
        <Routes>
          <Route path="/" element={<Navigate to={taskPaths.dashboard} replace />} />
          <Route element={<TaskAppShell />}>
            <Route
              path="/dashboard"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <DashboardPage />
                </Suspense>
              )}
            />
            <Route
              path="/tasks"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskCatalogPage />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/new"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskCreatePage />
                </Suspense>
              )}
            />
            <Route path="/tasks/:taskId" element={<Navigate to="overview" replace />} />
            <Route
              path="/tasks/:taskId/overview"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="overview" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/edit"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="task-editor" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/steps"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="steps" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/steps/new"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="step-editor" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/steps/:stepId/edit"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="step-editor" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/schedules"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="schedules" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/schedules/new"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="schedule-editor" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/schedules/:scheduleId/edit"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="schedule-editor" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/history"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="history" />
                </Suspense>
              )}
            />
            <Route
              path="/tasks/:taskId/step-logs"
              element={(
                <Suspense fallback={routeLoadingFallback}>
                  <TaskWorkspacePage view="step-logs" />
                </Suspense>
              )}
            />
          </Route>
          <Route path="*" element={<Navigate to={taskPaths.dashboard} replace />} />
        </Routes>
      </TaskUpdatesProvider>
    </BrowserRouter>
  )
}

export default App
