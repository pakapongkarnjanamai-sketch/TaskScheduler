# TaskScheduler - AI Engineering Guide

This document is the project-specific operating guide for AI coding agents working in this repository.

## 1. Project Overview & Business Context

TaskScheduler is an internal API management and task scheduling system used by operational staff inside the organization. Its purpose is to make internally developed APIs easier to manage, schedule, run, monitor, and troubleshoot through a controlled operational interface.

Crucial context for AI:

* **Target Audience:** Operational staff and internal support/engineering users.
* **System Nature:** Internal enterprise tool. Reliability, auditability, and predictable execution are more important than visual flair.
* **Primary Goal:** Centralize management of internal API-driven tasks, scheduled runs, manual runs, and execution visibility.
* **Core Philosophy:** Prefer operational safety, traceability, and maintainability over clever abstractions or unnecessary UI complexity.
* **Critical Constraints:** Windows Authentication, no duplicate concurrent execution for the same schedule, soft delete for Task and Schedule records, and preserved execution history.

## 2. Solution Map & Architecture Boundaries

This repository currently follows a pragmatic layered structure and should evolve toward Clean Architecture without forcing abstractions that do not yet exist. Respect the current project boundaries and avoid moving logic into the wrong layer.

| Project | Responsibility & Constraints |
| :--- | :--- |
| **TaskScheduler.Core** | Domain models, shared abstractions, core business rules, and domain-level validation. **Must not** depend on UI, DevExtreme, ASP.NET MVC, EF Core, SignalR, or database-specific concerns. |
| **TaskScheduler.Data** | Persistence and infrastructure layer. Owns EF Core, SQL Server access, repositories, and infrastructure services. May depend on Core, but should not contain UI logic. |
| **TaskScheduler.API** | HTTP API, SignalR hubs, background workers, and orchestration entry points. Controllers and hubs must stay thin and delegate work to services. Do not place business rules directly in controllers. |
| **TaskScheduler.Client** | ASP.NET Core MVC presentation layer using DevExtreme. Handles view composition, view models, and UI interactions only. Do not place persistence logic or domain rules in views/controllers. |
| **TaskScheduler.Tests** | xUnit test project for unit tests, especially domain rules, orchestration behavior, and regression coverage. |

Dependency rules:

1. **Core stays clean:** Do not reference EF Core, SQL Server, MVC, SignalR, or DevExtreme from Core.
2. **Data is infrastructure:** Treat TaskScheduler.Data as the infrastructure/data access layer.
3. **API stays thin:** Controllers, hubs, and hosted services should coordinate work, not own business rules.
4. **Client stays presentational:** Razor views and MVC controllers must not contain business logic beyond view composition and request flow.
5. **No fake layers:** Do not invent an Application layer or extra projects unless the user explicitly asks for that refactor.
6. **Move toward Clean Architecture pragmatically:** If logic is complex, extract services or domain-oriented components rather than expanding controllers or views.

## 3. Tech Stack & Environment

Do not introduce new technologies, libraries, or patterns without a concrete need and explicit approval.

* **Runtime / Language:** .NET 9 / C#
* **Backend:** ASP.NET Core Web API
* **Frontend:** ASP.NET Core MVC / Razor
* **Database & ORM:** SQL Server + EF Core
* **Real-time:** SignalR
* **API Documentation:** Swagger / OpenAPI
* **UI Library:** DevExtreme
* **Authentication:** Windows Authentication
* **Testing:** xUnit in TaskScheduler.Tests

Implementation notes:

* The current repository does not expose a dedicated Application project. Work within the existing structure unless a broader refactor is requested.
* New or refactored API contracts should standardize on **camelCase JSON**. If an existing endpoint currently uses a different casing, do not change it silently without considering compatibility.

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

1. **Lifecycle rule:** Task and Schedule entities follow this lifecycle: `Draft -> Active -> Paused -> Archived`.
2. **Active-only execution:** Only Active tasks and Active schedules are allowed to execute.
3. **No duplicate in-flight execution:** The same schedule must not be started again while a previous execution is still running, unless an explicit override requirement is introduced.
4. **Execution traceability:** Every task execution must produce a TaskExecutionLog, and every step execution must produce a StepExecutionLog with start time, end time, status, and error details when applicable.
5. **Operator accountability:** When an execution is triggered manually, capture the initiating user identity whenever it is available through Windows Authentication or the current user context.
6. **Failure visibility:** Do not swallow step or task failures. Persist failure status and a meaningful error message so operators can diagnose issues.
7. **Soft delete rule:** Task and Schedule records are soft deleted. Execution logs are historical records and should be preserved unless an explicit retention/archive policy is introduced.
8. **Consistent validation path:** Manual runs and scheduled runs should go through the same validation and logging rules where practical.

## 6. Security & Access Rules

Security assumptions for this repository:

* **Authentication model:** Windows Authentication is the default and expected model.
* **No parallel auth systems:** Do not introduce custom login pages, JWT flows, OAuth, or external identity providers unless explicitly requested.
* **Server-side enforcement:** Authorization decisions must be enforced in API/backend code, not just hidden in the UI.
* **Identity usage:** Use the current Windows user context when recording who initiated manual runs or administrative actions.
* **Least surprise:** If role/group mapping rules are missing, ask before inventing authorization behavior.

## 7. API, DTO, and Response Conventions

API and data contract rules:

1. **Always use DTOs** for API requests and responses.
2. **Never expose EF entities or domain entities directly** over HTTP.
3. **Use camelCase JSON** for new or refactored API payloads.
4. **Keep response shapes consistent** across endpoints. Prefer a standard success/error contract rather than ad hoc response objects.
5. **Use standard error payloads** with clear messages and machine-readable error codes when practical.
6. **Do not break existing clients casually.** If contract normalization would be a breaking change, call it out explicitly.

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
* **Accessibility:** Maintain semantic HTML, keyboard-friendly interactions, and reasonable accessibility baselines.
* **Separation of concerns:** UI handles rendering and interaction only. Business rules, validation rules, and persistence decisions belong outside the view layer.

## 9. Coding Standards & Implementation Conventions

* **C# naming:** Use `PascalCase` for classes, methods, properties, and DTO types.
* **Local naming:** Use `camelCase` for locals, parameters, and private fields that follow the repository style.
* **Async methods:** Suffix asynchronous methods with `Async`.
* **Exceptions:** Prefer specific validation/business exceptions over throwing generic `Exception` for expected business flows.
* **Logging:** Use structured logging for operational events and failures.
* **Long-running work:** Thread through cancellation tokens for I/O-bound or background operations when appropriate.
* **Controller discipline:** Keep controllers focused on request handling, validation flow, and service delegation.
* **Comment discipline:** Add comments only when they explain intent that is not obvious from the code itself.

## 10. Testing & Definition of Done

Testing expectations:

* Use **xUnit** in **TaskScheduler.Tests**.
* Prioritize **unit tests first**, especially for domain rules, scheduling orchestration, concurrency guards, DTO mapping, and validation behavior.
* If changing task execution behavior, schedule activation logic, or logging rules, add or update tests for those changes.
* If changing API contracts, verify casing and response/error shape consistency.

Before finalizing work, silently review this checklist:

- [ ] Does the change respect the project boundaries between Core, Data, API, Client, and Tests?
- [ ] Are lifecycle rules and no-duplicate-execution rules preserved?
- [ ] Are execution logs and failure details still captured correctly?
- [ ] Is Windows Authentication respected without inventing a parallel auth model?
- [ ] Are DTOs used correctly, without exposing entities directly?
- [ ] Are new or refactored API payloads aligned with camelCase and consistent response/error conventions?
- [ ] Were unit tests added or updated where behavior changed, or was the absence of tests explained?
- [ ] Is the code complete, maintainable, and free of placeholder logic?