import { appConfig } from '../config/appConfig'
import type { ApiResponse, DashboardSummary } from '../types/entities'

function endpoint(resource: string, action: string) {
  return `${appConfig.apiBaseUrl}${resource}/${action}`
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
