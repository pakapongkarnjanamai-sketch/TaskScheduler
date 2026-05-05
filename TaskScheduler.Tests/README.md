# TaskScheduler.Tests

This project contains xUnit tests for TaskScheduler.

## Test Conventions

* Prioritize API and service-layer behavior first, especially orchestration, validation, response contracts, and execution logging.
* Keep tests close to the owning layer by mirroring production folders such as `API/Services` and `Data/Services`.
* Use the naming pattern `MethodName_Scenario_ExpectedBehavior`.
* Prefer deterministic fakes and in-memory test doubles over real network calls, real SignalR connections, or ambient machine state.
* Use EF Core InMemory only for behavior-focused tests around orchestration and audit stamping. Do not rely on it to prove SQL Server-specific query behavior.
* When touching task execution logic, cover status transitions, execution logs, schedule recalculation, and failure visibility.
* When touching persistence logic, cover audit fields, soft delete behavior, and query safeguards.
* When touching Windows-auth-driven behavior, prefer explicit user-context tests instead of relying on the local developer identity.

## Suggested Folder Layout

* `API/Services`: task execution, orchestration, response-contract tests.
* `Data`: DbContext persistence and audit tests.
* `Data/Services`: current-user and infrastructure service tests.
* `Support`: shared fakes and test helpers.

## Current Baseline Coverage

* `CurrentUserService` identity parsing and fallback behavior.
* `TaskSchedulerDbContext` audit field stamping for create and update flows.
* `TaskRunnerService` success and failure orchestration, execution logging, schedule recalculation, and SignalR notifications.