import DataSource from 'devextreme/data/data_source'
import { createAdminStore, type AdminResource } from './adminApi'

export function createTaskScopedDataSource(resource: AdminResource, taskId: number, sortSelector?: string) {
  return new DataSource({
    store: createAdminStore(resource),
    filter: ['TaskId', '=', taskId],
    sort: sortSelector ? [{ selector: sortSelector, desc: false }] : undefined,
  })
}

export function createStepLogDataSource(taskId: number) {
  return new DataSource({
    store: createAdminStore('StepExecutionLogs'),
    filter: ['TaskExecutionLog.TaskId', '=', taskId],
    sort: [{ selector: 'StartTime', desc: true }],
  })
}

export function createTaskLogDataSource(taskId: number) {
  return new DataSource({
    store: createAdminStore('TaskExecutionLogs'),
    filter: ['TaskId', '=', taskId],
    sort: [{ selector: 'StartTime', desc: true }],
  })
}