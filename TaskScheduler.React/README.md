# TaskScheduler.React

React admin UI for TaskScheduler. This project is a Vite + React + TypeScript frontend that works beside the existing `TaskScheduler.Client` MVC UI and uses the same `TaskScheduler.API` endpoints.

## Purpose

- Provide a clean React implementation of the operational task console.
- Keep DevExtreme for data-heavy grids, editing, filtering, master-detail views, and remote data loading.
- Keep custom React UI small and focused for workflows where it is clearer than a generated grid editor, such as the schedule popup.
- Preserve existing API compatibility, including DevExtreme form payloads and PascalCase admin entities.

## Local Setup

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
```

Run linting:

```powershell
npm run lint
```

## API Configuration

The default local setup calls the API host directly so Windows/Negotiate authentication can complete against the API origin:

- `VITE_TASKSCHEDULER_APP_BASE_PATH=/`
- `VITE_TASKSCHEDULER_API_BASE_URL=https://localhost:7253/api/`
- `VITE_TASKSCHEDULER_HUB_URL=https://localhost:7253/taskHub`

Keep `TaskScheduler.API` running on that URL, or override the environment values for a different host. `vite.config.ts` still includes `/api` and `/taskHub` proxy routes for non-authenticated local experiments, but the direct API URL is the safer default while Windows Authentication is enabled.

When deploying the React app beneath an IIS subfolder, set `VITE_TASKSCHEDULER_APP_BASE_PATH` to that virtual path, for example `/Tools/TaskScheduler/React/`, so both router navigation and built asset URLs stay aligned.

In Development, the API now accepts loopback `http/https` origins, so local Vite ports such as `localhost:5173`, `localhost:4174`, or `127.0.0.1:4173` can call the real API and SignalR hub directly without switching to the proxy path.

Copy `.env.example` to `.env.local` when local overrides are needed.

## Feature Map

- `src/api` contains API stores, request helpers, scoped data sources, and SignalR updates.
- `src/config` contains environment-driven app configuration.
- `src/types` contains frontend contracts that mirror current API payloads.
- `src/features/tasks` contains the main task dashboard and detail tabs.
- `src/features/steps` contains the steps grid, remote reordering, and request-test action.
- `src/features/schedules` contains recurrence rules, schedule summaries, the schedules grid, and the custom schedule editor.
- `src/features/logs` contains execution history dialogs.
- `src/features/requestTests` contains the request-test result dialog.

## Notes

The current API is still largely DevExtreme-admin shaped. New React code should keep using the existing `values` form contract for admin CRUD until the backend exposes dedicated React/standard DTO endpoints.