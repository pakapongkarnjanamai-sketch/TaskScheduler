import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import config from 'devextreme/core/config'
import { licenseKey } from './devextreme-license'
import { TaskUpdatesProvider } from './api/TaskUpdatesProvider'
import { TaskAppShell } from './features/tasks/TaskAppShell'
import { TaskCatalogPage } from './features/tasks/TaskCatalogPage'
import { TaskCreatePage } from './features/tasks/TaskCreatePage'
import { taskPaths } from './features/tasks/taskRoutes'
import { TaskWorkspacePage } from './features/tasks/TaskWorkspacePage'

if (licenseKey) {
  config({ licenseKey })
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

function App() {
  return (
    <BrowserRouter basename={routerBasePath}>
      <TaskUpdatesProvider>
        <Routes>
          <Route path="/" element={<Navigate to={taskPaths.catalog} replace />} />
          <Route element={<TaskAppShell />}>
            <Route path="/tasks" element={<TaskCatalogPage />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/:taskId" element={<Navigate to="overview" replace />} />
            <Route path="/tasks/:taskId/overview" element={<TaskWorkspacePage view="overview" />} />
            <Route path="/tasks/:taskId/edit" element={<TaskWorkspacePage view="task-editor" />} />
            <Route path="/tasks/:taskId/steps" element={<TaskWorkspacePage view="steps" />} />
            <Route path="/tasks/:taskId/steps/new" element={<TaskWorkspacePage view="step-editor" />} />
            <Route path="/tasks/:taskId/steps/:stepId/edit" element={<TaskWorkspacePage view="step-editor" />} />
            <Route path="/tasks/:taskId/schedules" element={<TaskWorkspacePage view="schedules" />} />
            <Route path="/tasks/:taskId/schedules/new" element={<TaskWorkspacePage view="schedule-editor" />} />
            <Route path="/tasks/:taskId/schedules/:scheduleId/edit" element={<TaskWorkspacePage view="schedule-editor" />} />
            <Route path="/tasks/:taskId/history" element={<TaskWorkspacePage view="history" />} />
            <Route path="/tasks/:taskId/step-logs" element={<TaskWorkspacePage view="step-logs" />} />
          </Route>
          <Route path="*" element={<Navigate to={taskPaths.catalog} replace />} />
        </Routes>
      </TaskUpdatesProvider>
    </BrowserRouter>
  )
}

export default App
