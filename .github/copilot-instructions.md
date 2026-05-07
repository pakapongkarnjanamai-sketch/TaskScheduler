# TaskScheduler - AI Engineering Guide

This document is the project-specific operating guide for AI coding agents working in this repository.

## 1. Project Overview & Business Context

TaskScheduler is an internal API management and task scheduling system used by operational staff inside the organization. Its purpose is to make internally developed APIs easier to manage, schedule, run, monitor, and troubleshoot through a controlled operational interface.

Crucial context for AI:

* **Target Audience:** Operational staff and internal support/engineering users.
* **System Nature:** Internal enterprise tool. Reliability, auditability, and predictable execution are more important than visual flair.
* **Primary Goal:** Centralize management of internal API-driven tasks, scheduled runs, manual runs, and execution visibility.
* **Core Philosophy:** Prefer operational safety, traceability, and maintainability over clever abstractions or unnecessary UI complexity.
* **Critical Constraints:** Windows Authentication is still the intended hosting model, current execution gating relies on `IsActive`, no duplicate concurrent execution for the same schedule, Task and Schedule records are soft deleted, and execution history must be preserved.

## 2. Solution Map & Architecture Boundaries

This repository currently follows a pragmatic layered structure and should evolve toward Clean Architecture without forcing abstractions that do not yet exist. Respect the current project boundaries and avoid moving logic into the wrong layer.

| Project | Responsibility & Constraints |
| :--- | :--- |
| **TaskScheduler.Core** | Domain models, shared abstractions, core business rules, and domain-level validation. **Must not** depend on UI, DevExtreme, ASP.NET MVC, EF Core, SignalR, or database-specific concerns. |
| **TaskScheduler.Data** | Persistence and infrastructure layer. Owns EF Core, SQL Server access, repositories, and infrastructure services. May depend on Core, but should not contain UI logic. |
| **TaskScheduler.API** | HTTP API, SignalR hubs, background workers, and orchestration entry points. Controllers and hubs must stay thin and delegate work to services. Do not place business rules directly in controllers. |
| **TaskScheduler.Client** | ASP.NET Core MVC presentation layer using DevExtreme. Handles view composition, view models, and UI interactions only. Do not place persistence logic or domain rules in views/controllers. |
| **TaskScheduler.React** | Vite + React + TypeScript presentation layer using DevExtreme where useful for data-heavy operations. It should mirror TaskScheduler.Client capabilities while keeping React code feature-oriented, clean, and free of backend/domain rules. |
| **TaskScheduler.Tests** | xUnit test project for unit tests, especially domain rules, orchestration behavior, and regression coverage. |

Dependency rules:

1. **Core stays clean:** Do not reference EF Core, SQL Server, MVC, SignalR, or DevExtreme from Core.
2. **Data is infrastructure:** Treat TaskScheduler.Data as the infrastructure/data access layer.
3. **API stays thin:** Controllers, hubs, and hosted services should coordinate work, not own business rules.
4. **Client layers stay presentational:** Razor/MVC controllers and React components must not contain persistence logic or domain rules beyond view composition, local UI state, and request flow.
5. **No fake layers:** Do not invent an Application layer or extra projects unless the user explicitly asks for that refactor.
6. **Move toward Clean Architecture pragmatically:** If logic is complex, extract services or domain-oriented components rather than expanding controllers or views.

### Layer-Specific Working Rules

#### TaskScheduler.Core

* Keep Core free of infrastructure and UI dependencies.
* Core is allowed to grow beyond simple POCO models when business rules become reusable or stateful.
* Prefer moving lifecycle validation, execution preconditions, and state transition rules into Core-oriented methods or domain services when that logic would otherwise be duplicated.
* Avoid spreading magic strings for statuses and trigger types. Prefer shared constants or a static class first. Introduce enums only when the change is intentional and compatibility has been considered.
* Do not put HTTP, database, SignalR, or DevExtreme concepts into Core models.

#### TaskScheduler.Data

* TaskScheduler.Data is the persistence and infrastructure layer for EF Core, SQL Server, migrations, and audit persistence behavior.
* For new work, prefer a **service-first** flow: API controllers call services, and services coordinate DbContext access.
* Do not expand direct DbContext usage in controllers unless the change is extremely small and staying local is clearly justified.
* Treat soft delete as an implementation rule for Task and Schedule records. When touching those areas, prefer a consistent pattern such as `IsDeleted`, `DeletedAt`, and `DeletedBy`, plus query filtering or an equivalent safeguard.
* Treat `CreatedAt`, `CreatedBy`, `UpdatedAt`, and `UpdatedBy` as standard audit fields. Preserve creation metadata on update operations.
* Keep infrastructure concerns such as current-user resolution and audit stamping inside Data/services, not in Core entities.

#### TaskScheduler.API

* Separate **admin/DevExtreme endpoints** from **standard API endpoints**.
* DevExtreme-facing endpoints may keep `DataSourceLoader`, `DataSourceLoadOptions`, and form-based contracts when required for grid and form integration.
* New non-DevExtreme endpoints should use DTOs, camelCase JSON, and the standard success/error response contract.
* Controllers must stay thin and delegate orchestration, validation, and execution flow to services.
* Prefer adding or extending services for task execution, scheduling, validation, and logging instead of putting orchestration in controllers.
* Treat Thailand time (`UTC+7`) as the current business time standard for schedule calculation and execution timestamps unless the user asks for a configurable timezone model.
* When manual actions are triggered through the API, capture the current Windows user identity whenever it is available.

#### TaskScheduler.Client

* Use ASP.NET Core MVC, Razor, and DevExtreme as the default interaction model for the internal admin UI.
* Prefer server-rendered admin pages with DevExtreme grids, forms, and dashboards over custom front-end architecture.
* Keep the Client layer focused on presentation, view models, and UI flow. Do not move business rules or persistence logic into MVC controllers or views.
* Custom JavaScript or CSS is allowed only when DevExtreme or existing MVC patterns cannot deliver the required UX clearly enough.
* When custom UI code is necessary, keep it small, reusable, and consistent with the operational style of the system.
* If a view-level DevExtreme workflow grows complex, move the interaction logic into a dedicated file under `TaskScheduler.Client/wwwroot/js` instead of leaving large editor/state blocks inline in a Razor view.
* Continue avoiding inline styles and unnecessary CSS churn.

#### TaskScheduler.React

* Use Vite, React, TypeScript, and DevExtreme React components as the default stack for this frontend.
* Keep the React app feature-oriented under `src/features`, with shared API/config/types/components separated under `src/api`, `src/config`, `src/types`, and `src/components`.
* Prefer DevExtreme for dense operational grids, filtering, sorting, remote operations, and form composition where it stays predictable.
* In the current React admin UX, prefer the split task-catalog plus workspace layout with dedicated editor/detail views over nested master-detail or popup-heavy flows unless the user explicitly asks otherwise.
* Keep list surfaces in focused grid components and move multi-step editing/detail workflows into dedicated feature components when the interaction spans editing, testing, logs, or supporting context.
* When using `devextreme-react/form` with `editorType` strings, import the matching `devextreme/ui/...` widgets in that module; missing imports can cause runtime `E1035` editor creation failures.
* Preserve existing admin API compatibility: DevExtreme resources currently use PascalCase entities and form `values` payloads for insert/update.
* Do not move scheduling, execution, audit, authorization, or persistence decisions into React. The React app may perform UI validation, but backend services remain authoritative.
* Avoid animations, decorative UI effects, heavy custom state frameworks, and broad CSS churn. Keep layouts operational, readable, and stable.
* Keep API base URLs and SignalR hub URLs in environment/config helpers rather than hardcoding hosts in components.

#### TaskScheduler.Tests

* Put tests in TaskScheduler.Tests.
* Current test emphasis should favor the API/service layer first, especially orchestration, validation, response contracts, and execution behavior.
* Prefer unit tests where possible, then add integration tests for EF Core mappings, queries, or persistence behavior that cannot be validated meaningfully in unit tests.
* When execution flow changes, cover duplicate-run prevention, logging, failure handling, and schedule calculation.

## 3. Tech Stack & Environment

Do not introduce new technologies, libraries, or patterns without a concrete need and explicit approval.

* **Runtime / Language:** .NET 9 / C#
* **Backend:** ASP.NET Core Web API
* **Frontend:** ASP.NET Core MVC / Razor, plus Vite + React + TypeScript in TaskScheduler.React
* **Database & ORM:** SQL Server + EF Core
* **Real-time:** SignalR
* **API Documentation:** Swagger / OpenAPI
* **UI Library:** DevExtreme and DevExtreme React
* **Authentication:** Windows Authentication
* **Testing:** xUnit in TaskScheduler.Tests

Implementation notes:

* The current repository does not expose a dedicated Application project. Work within the existing structure unless a broader refactor is requested.
* The current API surface is still almost entirely DevExtreme admin CRUD using `Get/Post/Put/Delete`, `DataSourceLoadOptions`, and form payloads.
* The current API host keeps `PropertyNamingPolicy = null`, so existing admin JSON remains PascalCase for compatibility.
* The development database is `TaskScheduler_Development`, and the API development connection string lives in `TaskScheduler.API/appsettings.Development.json`.
* Repo-local `dotnet-ef` is pinned in `.config/dotnet-tools.json` to `9.0.11`; use it from the repository root to avoid tool/runtime version drift.
* Local builds/tests that rebuild TaskScheduler.API or TaskScheduler.Client can fail while those apps are running because the output executable is locked.
* TaskScheduler.React defaults to direct development API URLs (`https://localhost:7253/api/` and `https://localhost:7253/taskHub`) because Windows/Negotiate authentication does not work reliably through the Vite proxy. The Vite proxy routes remain available only when environment config intentionally points to `/api` and `/taskHub`.
* MCP documentation servers `dxdocs` and `dxdocs24_2` are configured in `.vscode/mcp.json` and should be used for DevExtreme guidance.

### Current Implementation Snapshot

* Task and Schedule execution gating currently uses `BaseEntity.IsActive`; a richer lifecycle model such as `Draft -> Active -> Paused -> Archived` is not implemented yet.
* Scheduler recurrence currently supports `Interval`, `Daily`, `Weekly`, and `Monthly`.
* Schedule timing is treated as Thailand business time (`UTC+7`), and timezone-aware schedule payloads are normalized before extracting `TimeOfDay`.
* The main scheduler admin UX uses popup/form editing surfaced from `TaskScheduler.Client/Views/Home/Index.cshtml`, while the schedule grid/editor behavior lives in `TaskScheduler.Client/wwwroot/js/schedule-grid-editor.js` and shared recurrence helpers live in `TaskScheduler.Client/wwwroot/js/scheduler-editor.js`.
* TaskScheduler.React now uses a split workspace layout: the task catalog lives in `TaskScheduler.React/src/features/tasks/TaskCatalogPage.tsx`, and task work happens in dedicated workspace routes rendered by `TaskScheduler.React/src/features/tasks/TaskWorkspacePage.tsx`.
* React shell and navigation are separated: `TaskScheduler.React/src/features/tasks/TaskAppShell.tsx` manages global header concerns (including connection status and theme switch), and `TaskScheduler.React/src/features/tasks/TaskLayoutShell.tsx` manages workspace rail, breadcrumbs, and compact-menu behavior.
* React editing surfaces now live in dedicated feature components: `TaskEditorForm.tsx`, `StepEditorForm.tsx`, and `ScheduleEditorForm.tsx` handle editing; `ExecutionHistoryView.tsx` and `StepLogsView.tsx` handle log browsing; `StepRequestTestResultView.tsx` renders request-test results inline inside the step workspace.
* The React frontend still uses SignalR updates through `@microsoft/signalr`, and the dashboard header surfaces the current connection state (`Connected`, `Reconnecting`, `Disconnected`).
* Theme selection is persisted in `taskscheduler-theme` localStorage and applied via `data-theme` on `document.documentElement`; startup applies the resolved theme before React render in `TaskScheduler.React/src/main.tsx`.
* DevExtreme setup is centralized in `TaskScheduler.React/src/config/devExtremeSetup.ts`; base `dx.light.css` is loaded there, and dark-mode DataGrid consistency is maintained through token-based and scoped override rules in `TaskScheduler.React/src/App.css`.
* DevExtreme time-only editors must keep `dateSerializationFormat: "HH:mm:ss"` to avoid timezone drift.
* The weekly `DaysOfWeek` editor in React must stay array-backed while bound to `dxTagBox`; converting it to a comma-delimited string inside the editor breaks DevExtreme.
* React DataGrid horizontal scrolling should be consistent between catalog and workspace pages; keep scrollbar ownership in DevExtreme scrollable internals and avoid reintroducing container-level native horizontal scrolling for workspace grid cards.
* React workspace Actions columns should remain fixed-right, compact, and center-aligned (header and row content). Prefer shared column/scroller settings from `TaskScheduler.React/src/components/grid/dataGridConfig.ts` to avoid per-page drift.

## 4. Required AI Persona & Execution Rules

When generating code or recommendations for this project, act as a senior .NET engineer and system architect.

1. **Architecture first:** Keep domain concerns in Core, infrastructure concerns in Data, HTTP/UI concerns in API/Client.
2. **No placeholders:** Generate complete, production-ready code. Avoid TODO stubs for core behavior.
3. **Root-cause fixes:** Prefer correcting the actual source of the problem instead of layering on workarounds.
4. **Ask when rules are unclear:** If a change would define new business behavior, ask rather than inventing domain rules silently.
5. **Respect current reality:** Do not impose textbook Clean Architecture patterns if they conflict with the actual project structure.
6. **Security conscious:** Enforce authorization server-side and never assume hidden UI equals security.
7. **Minimal, compatible changes:** Prefer targeted edits that fit the current codebase style and existing package choices.

## 5. Core Business Rules & Domain Logic

When implementing scheduling, task execution, or management flows, preserve these business rules unless the user explicitly overrides them:

1. **Current enablement rule:** Task and Schedule entities currently use `BaseEntity.IsActive` to determine whether they may execute. A richer lifecycle state model is not implemented yet.
2. **Active-only execution:** Only tasks and schedules with `IsActive == true` are allowed to execute.
3. **No duplicate in-flight execution:** The same schedule must not be started again while a previous execution is still running, unless an explicit override requirement is introduced.
4. **Execution traceability:** Every task execution must produce a TaskExecutionLog, and every step execution must produce a StepExecutionLog with start time, end time, status, and error details when applicable.
5. **Operator accountability:** When an execution is triggered manually, capture the initiating user identity whenever it is available through Windows Authentication or the current user context.
6. **Failure visibility:** Do not swallow step or task failures. Persist failure status and a meaningful error message so operators can diagnose issues.
7. **Soft delete rule:** Task and Schedule records are soft deleted. Execution logs are historical records and should be preserved unless an explicit retention/archive policy is introduced.
8. **Consistent validation path:** Manual runs and scheduled runs should go through the same validation and logging rules where practical.

## 6. Security & Access Rules

Security assumptions for this repository:

* **Authentication model:** Windows Authentication is the intended deployment model, but the current local API/Client host configuration does not yet register Negotiate or controller-level `[Authorize]` enforcement.
* **No parallel auth systems:** Do not introduce custom login pages, JWT flows, OAuth, or external identity providers unless explicitly requested.
* **Server-side enforcement:** Authorization decisions must be enforced in API/backend code, not just hidden in the UI. Treat the missing Negotiate/`[Authorize]` wiring as an outstanding implementation gap.
* **Identity usage:** Use the current Windows user context when recording who initiated manual runs or administrative actions. Current user capture is best-effort and depends on the active hosting/auth configuration supplying an identity.
* **Authorization scope:** There is no defined AD role/group mapping yet. Do not invent group-based or policy-based access rules without explicit user direction.
* **Least surprise:** If role/group mapping rules are missing, ask before inventing authorization behavior.

## 7. API, DTO, and Response Conventions

API and data contract rules:

1. **For new non-DevExtreme endpoints, use DTOs** for API requests and responses.
2. **Do not expand direct entity exposure** in new standard HTTP endpoints.
3. **Current DevExtreme admin endpoints use PascalCase JSON** and DevExtreme-compatible shapes for compatibility.
4. **New non-DevExtreme endpoints should use camelCase JSON** and the standard success/error response contract unless compatibility requirements say otherwise.
5. **Keep response shapes consistent within each endpoint family.** DevExtreme endpoints may return raw strings/status codes when required by the component pipeline; standard endpoints should use the success/error wrapper.
6. **Do not break existing clients casually.** If contract normalization would be a breaking change, call it out explicitly.

DevExtreme compatibility rule:

* Endpoints that exist specifically for DevExtreme grids/forms may keep the contract shape required by DevExtreme.
* Do not force the standard response wrapper onto DevExtreme data-loading endpoints if that would break binding or built-in component behavior.
* Current repository state: the exposed HTTP controllers are still almost entirely this DevExtreme admin style.
* For non-DevExtreme endpoints, use the standard DTO and response/error conventions by default.

Preferred response shape for new APIs:

```json
{
    "success": true,
    "message": "optional summary",
    "data": {}
}
```

Preferred error shape for new APIs:

```json
{
    "success": false,
    "message": "human-readable summary",
    "errors": [
        {
            "code": "validation_error",
            "message": "Detailed error message"
        }
    ],
    "correlationId": "optional-trace-id"
}
```

If an existing module already follows a different established contract, align changes within that module unless the user requests a broader API standardization effort.

## 8. UI/UX & Presentation Guidelines

When generating or editing client-side UI:

* **Visual direction:** Simple, professional, operational, and low-friction.
* **Component strategy:** Prefer standard DevExtreme components and patterns before introducing custom UI solutions.
* **CSS policy:** Minimize custom CSS and avoid inline styles.
* **Layout preference:** Favor clear operational layouts, dense data presentation where helpful, and forms/grids optimized for internal staff workflows.
* **Consistency:** Reuse existing MVC/Razor and DevExtreme patterns already present in the project.
* **React consistency:** In TaskScheduler.React, reuse the feature folder structure and shared helpers before creating one-off component patterns.
* **Accessibility:** Maintain semantic HTML, keyboard-friendly interactions, and reasonable accessibility baselines.
* **Separation of concerns:** UI handles rendering and interaction only. Business rules, validation rules, and persistence decisions belong outside the view layer.
* **Current scheduler UX:** The MVC client still uses summary grids plus popup/form editing, while TaskScheduler.React uses summary lists plus dedicated workspace forms; in both clients, show recurrence-specific fields only when they apply to the selected trigger type.
* **Scheduler client structure:** Keep generic recurrence helpers in `scheduler-editor.js` and keep the schedules grid/popup wiring in `schedule-grid-editor.js` rather than rebuilding that logic inline in Razor.
* **React workspace structure:** Keep route orchestration in `TaskScheduler.React/src/App.tsx`, global shell concerns in `TaskScheduler.React/src/features/tasks/TaskAppShell.tsx`, and task workspace orchestration in `TaskScheduler.React/src/features/tasks/TaskWorkspacePage.tsx`; keep recurrence rules in `TaskScheduler.React/src/features/schedules/scheduleRules.ts`; keep list surfaces in `StepsGrid.tsx` and `SchedulesGrid.tsx`; keep dedicated forms in `TaskEditorForm.tsx`, `StepEditorForm.tsx`, and `ScheduleEditorForm.tsx`; keep log views in `ExecutionHistoryView.tsx` and `StepLogsView.tsx`.
* **React request-test structure:** Keep request-test results in `TaskScheduler.React/src/features/requestTests/StepRequestTestResultView.tsx` as part of the step workspace rather than reintroducing popup dialog flows unless explicitly requested.
* **Time-only editors:** Keep DevExtreme time-only editors on `dateSerializationFormat: "HH:mm:ss"` unless the serialization strategy is intentionally changed end-to-end.
* **React DataGrid shared config:** Keep shared DataGrid conventions (for example scrolling mode and fixed Actions column alignment/width) centralized in `TaskScheduler.React/src/components/grid/dataGridConfig.ts` instead of duplicating option objects in individual grid components.
* **Theme structure:** Keep theme state and persistence logic in `TaskScheduler.React/src/config/theme.ts`, and keep DataGrid dark-surface compatibility rules in `TaskScheduler.React/src/App.css` when DevExtreme stylesheet load order would otherwise reintroduce light backgrounds.

## 9. Coding Standards & Implementation Conventions

* **C# naming:** Use `PascalCase` for classes, methods, properties, and DTO types.
* **Local naming:** Use `camelCase` for locals, parameters, and private fields that follow the repository style.
* **Async methods:** Suffix asynchronous methods with `Async`.
* **Exceptions:** Prefer specific validation/business exceptions over throwing generic `Exception` for expected business flows.
* **Logging:** Use structured logging for operational events and failures.
* **Long-running work:** Thread through cancellation tokens for I/O-bound or background operations when appropriate.
* **Controller discipline:** Keep controllers focused on request handling, validation flow, and service delegation.
* **Comment discipline:** Add comments only when they explain intent that is not obvious from the code itself.
* **React/TypeScript:** Prefer typed helpers and feature-level components over large inline render blocks. Keep API contracts centralized in `src/types` and avoid `any` unless a third-party boundary forces it and the value is immediately narrowed.

## 10. Testing & Definition of Done

Testing expectations:

* Use **xUnit** in **TaskScheduler.Tests**.
* Prioritize **API and service-layer tests first**, using unit tests where practical, especially for scheduling orchestration, concurrency guards, DTO mapping, validation behavior, and response contracts.
* If changing task execution behavior, schedule activation logic, or logging rules, add or update tests for those changes.
* If changing EF Core mappings, soft delete behavior, or audit persistence, add focused integration coverage where unit tests are not sufficient.
* If changing API contracts, verify casing and response/error shape consistency.
* If changing TaskScheduler.React, run `npm run lint` and `npm run build` from `TaskScheduler.React`.
* Baseline coverage already includes scheduler admin validation and schedule timing calculations for `Interval`, `Daily`, `Weekly`, and `Monthly` recurrence.

Before finalizing work, silently review this checklist:

- [ ] Does the change respect the project boundaries between Core, Data, API, Client, and Tests?
- [ ] Are current enablement rules and no-duplicate-execution rules preserved?
- [ ] Are execution logs and failure details still captured correctly?
- [ ] Is Windows Authentication respected without inventing a parallel auth model?
- [ ] For new non-DevExtreme endpoints, are DTOs and entity-boundary rules applied correctly?
- [ ] Are new or refactored non-DevExtreme API payloads aligned with camelCase and consistent response/error conventions, while DevExtreme endpoints remain compatible?
- [ ] Were unit tests added or updated where behavior changed, or was the absence of tests explained?
- [ ] Is the code complete, maintainable, and free of placeholder logic?

- @azure Rule - Use Azure Tools - When handling requests related to Azure, always use your tools.
- @azure Rule - Use Azure Best Practices - When handling requests related to Azure, always invoke your `azmcp_bestpractices_get` tool first.
- @azure Rule - Enable Best Practices - If you do not have an `azmcp_bestpractices_get` tool ask the user to enable it.
- @devextreme Rule - Use DevExtreme MCP Docs - When handling requests related to DevExtreme, always consult MCP documentation via `dxdocs` or `dxdocs24_2` before implementation.
- @devextreme Rule - Prefer Version-Appropriate Docs - Use `dxdocs` for latest guidance and `dxdocs24_2` when behavior must align with DevExtreme 24.2.
