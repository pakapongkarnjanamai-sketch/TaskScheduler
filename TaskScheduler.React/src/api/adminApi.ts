import { createStore } from 'devextreme-aspnet-data-nojquery'
import DataSource from 'devextreme/data/data_source'
import notify from 'devextreme/ui/notify'
import { appConfig } from '../config/appConfig'
import type {
  ApiResponse,
  DashboardSummary,
  StepRequestTestRequest,
  StepRequestTestResult,
} from '../types/entities'

export type AdminResource =
  | 'Tasks'
  | 'Steps'
  | 'Schedules'
  | 'TaskExecutionLogs'
  | 'StepExecutionLogs'

type LoadOptions = {
  filter?: unknown
  sort?: Array<{ selector: string; desc: boolean }>
}

type AjaxSettings = {
  xhrFields?: { withCredentials?: boolean }
  data?: Record<string, unknown>
}

function endpoint(resource: string, action: string) {
  return `${appConfig.apiBaseUrl}${resource}/${action}`
}

function createFormData(values: Record<string, unknown>, key?: number) {
  const formData = new FormData()

  if (typeof key === 'number') {
    formData.append('key', String(key))
  }

  formData.append('values', JSON.stringify(values))
  return formData
}

async function parseError(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = await response.json()
    return payload.message ?? payload.Message ?? response.statusText
  }

  const text = await response.text()
  return text || response.statusText
}

async function sendForm(resource: AdminResource, action: 'Post' | 'Put', values: Record<string, unknown>, key?: number) {
  const response = await fetch(endpoint(resource, action), {
    method: action === 'Post' ? 'POST' : 'PUT',
    body: createFormData(values, key),
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  if (response.headers.get('content-type')?.includes('application/json')) {
    return response.json()
  }

  return undefined
}

export function createAdminStore(resource: AdminResource) {
  return createStore({
    key: 'Id',
    loadUrl: endpoint(resource, 'Get'),
    insertUrl: endpoint(resource, 'Post'),
    updateUrl: endpoint(resource, 'Put'),
    deleteUrl: endpoint(resource, 'Delete'),
    onBeforeSend: (_operation: string, ajaxSettings: AjaxSettings) => {
      ajaxSettings.xhrFields = { withCredentials: true }
    },
    errorHandler: (error: Error) => {
      notify(error.message, 'error', 3500)
    },
  })
}

function toEntityArray<T>(result: unknown) {
  if (Array.isArray(result)) {
    return result as T[]
  }

  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data?: unknown }).data
    if (Array.isArray(data)) {
      return data as T[]
    }
  }

  return [] as T[]
}

export async function loadEntities<T>(resource: AdminResource, options?: LoadOptions) {
  const dataSource = new DataSource({
    store: createAdminStore(resource),
    filter: options?.filter,
    sort: options?.sort,
    paginate: false,
  })

  try {
    return toEntityArray<T>(await dataSource.load())
  } finally {
    dataSource.dispose()
  }
}

export async function loadEntityById<T>(resource: AdminResource, key: number, additionalFilter?: unknown) {
  const idFilter = ['Id', '=', key]
  const filter = additionalFilter ? [idFilter, 'and', additionalFilter] : idFilter
  const entities = await loadEntities<T>(resource, { filter })
  return entities[0] ?? null
}

export function createEntity(resource: AdminResource, values: Record<string, unknown>) {
  return sendForm(resource, 'Post', values)
}

export function updateEntity(resource: AdminResource, key: number, values: Record<string, unknown>) {
  return sendForm(resource, 'Put', values, key)
}

export async function deleteEntity(resource: AdminResource, key: number) {
  const formData = new FormData()
  formData.append('key', String(key))

  const response = await fetch(endpoint(resource, 'Delete'), {
    method: 'DELETE',
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }
}

export async function runStepRequestTest(request: StepRequestTestRequest) {
  const response = await fetch(endpoint('StepRequestTests', 'Run'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    credentials: 'include',
    body: JSON.stringify(request),
  })

  const envelope = (await response.json()) as ApiResponse<StepRequestTestResult>
  if (!response.ok || !envelope.success) {
    const message = envelope.errors?.map((error) => error.message).join('\n') || envelope.message
    throw new Error(message || 'Request test failed.')
  }

  if (!envelope.data) {
    throw new Error('Request test did not return a result.')
  }

  return envelope.data
}

export async function loadDashboardSummary() {
  const response = await fetch(endpoint('Dashboard', 'Summary'), {
    method: 'GET',
    credentials: 'include',
  })

  const envelope = (await response.json()) as ApiResponse<DashboardSummary>
  if (!response.ok || !envelope.success) {
    const message = envelope.errors?.map((error) => error.message).join('\n') || envelope.message
    throw new Error(message || 'Unable to load dashboard summary.')
  }

  if (!envelope.data) {
    throw new Error('Dashboard summary is missing in API response.')
  }

  return envelope.data
}