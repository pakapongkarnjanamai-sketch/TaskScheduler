function normalizeBaseUrl(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.endsWith('/') ? trimmedValue : `${trimmedValue}/`
}

function resolveHubUrl(apiBaseUrl: string) {
  const configuredHubUrl = import.meta.env.VITE_TASKSCHEDULER_HUB_URL
  if (configuredHubUrl) {
    return configuredHubUrl
  }

  if (apiBaseUrl.startsWith('/')) {
    return '/taskHub'
  }

  return new URL('../taskHub', apiBaseUrl).toString()
}

const apiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_TASKSCHEDULER_API_BASE_URL ?? 'https://localhost:7253/api/',
)

export const appConfig = {
  apiBaseUrl,
  hubUrl: resolveHubUrl(apiBaseUrl),
  requestTestEchoUrl: `${apiBaseUrl}RequestTest/Echo`,
}