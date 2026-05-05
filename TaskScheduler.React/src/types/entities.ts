export interface BaseEntity {
  Id: number
  IsActive: boolean
  CreatedAt?: string | null
  UpdatedAt?: string | null
  CreatedBy?: string | null
  UpdatedBy?: string | null
}

export interface TaskSummary extends BaseEntity {
  Name: string
  Description?: string | null
  LastStatus?: string | null
  LastExecutionTime?: string | null
  NextExecutionTime?: string | null
}

export interface Step extends BaseEntity {
  TaskId: number
  Name: string
  Description?: string | null
  Order: number
  ApiUrl: string
  HttpMethod: string
  Headers?: string | null
  Body?: string | null
}

export interface Schedule extends BaseEntity {
  TaskId: number
  Name: string
  Description?: string | null
  TriggerType: ScheduleTriggerType
  IntervalTime?: number | null
  StartTime?: string | null
  DaysOfWeek?: string | string[] | null
  DayOfMonth?: number | null
  NextExecutionTime?: string | null
}

export type ScheduleTriggerType = 'Interval' | 'Daily' | 'Weekly' | 'Monthly'

export interface TaskExecutionLog extends BaseEntity {
  TaskId: number
  TriggerId: number
  StartTime: string
  EndTime?: string | null
  Status: string
  ResponseMessage?: string | null
}

export interface StepExecutionLog extends BaseEntity {
  TaskExecutionLogId: number
  TaskExecutionLog?: {
    TaskId: number
  } | null
  StepName: string
  Order: number
  StartTime: string
  EndTime?: string | null
  Status: string
  ResponseMessage?: string | null
}

export interface StepRequestTestRequest {
  name: string
  apiUrl: string
  httpMethod: string
  headers?: string | null
  body?: string | null
}

export interface StepRequestSnapshot {
  method: string
  url: string
  headers: Record<string, string[]>
  body?: string | null
}

export interface StepResponseSnapshot {
  statusCode?: number | null
  reasonPhrase?: string | null
  isSuccessStatusCode: boolean
  headers: Record<string, string[]>
  body?: string | null
  errorMessage?: string | null
}

export interface StepRequestTestResult {
  stepName: string
  durationMs: number
  request: StepRequestSnapshot
  response: StepResponseSnapshot
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T | null
  errors?: Array<{
    code: string
    message: string
  }>
  correlationId?: string | null
}