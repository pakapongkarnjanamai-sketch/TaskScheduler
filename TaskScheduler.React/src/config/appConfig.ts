function normalizeBaseUrl(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.endsWith('/') ? trimmedValue : `${trimmedValue}/`
}

function isRelativeBaseUrl(value: string) {
  return value.startsWith('/')
}

function shouldUseLocalhostFallback() {
  if (typeof window === 'undefined') {
    return false
  }

  const host = window.location.hostname.toLowerCase()
  return host === 'localhost' || host === '127.0.0.1'
}

function resolveApiBaseUrl() {
  const configuredApiBaseUrl = normalizeBaseUrl(
    import.meta.env.VITE_TASKSCHEDULER_API_BASE_URL ?? 'https://localhost:7253/api/',
  )

  // Relative API paths are fine behind IIS reverse proxy, but on localhost/IP preview
  // they frequently produce Windows-auth 401 responses on the frontend host.
  if (isRelativeBaseUrl(configuredApiBaseUrl) && shouldUseLocalhostFallback()) {
    return 'https://localhost:7253/api/'
  }

  return configuredApiBaseUrl
}

function resolveHubUrl(apiBaseUrl: string) {
  const configuredHubUrl = import.meta.env.VITE_TASKSCHEDULER_HUB_URL
  if (configuredHubUrl) {
    const normalizedHubUrl = configuredHubUrl.trim()

    if (normalizedHubUrl.startsWith('/') && shouldUseLocalhostFallback()) {
      return new URL('../taskHub', apiBaseUrl).toString()
    }

    return normalizedHubUrl
  }

  if (apiBaseUrl.startsWith('/')) {
    return '/taskHub'
  }

  return new URL('../taskHub', apiBaseUrl).toString()
}

const apiBaseUrl = resolveApiBaseUrl()

export const appConfig = {
  apiBaseUrl,
  hubUrl: resolveHubUrl(apiBaseUrl),
  requestTestEchoUrl: `${apiBaseUrl}RequestTest/Echo`,
}