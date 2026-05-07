export type ThemeMode = 'light' | 'dark'

const themeStorageKey = 'taskscheduler-theme'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function resolveInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey)
  if (isThemeMode(storedTheme)) {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function readDocumentTheme(): ThemeMode | null {
  if (typeof document === 'undefined') {
    return null
  }

  const currentTheme = document.documentElement.getAttribute('data-theme')
  return isThemeMode(currentTheme) ? currentTheme : null
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.setAttribute('data-theme', theme)
}

export function persistTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(themeStorageKey, theme)
}