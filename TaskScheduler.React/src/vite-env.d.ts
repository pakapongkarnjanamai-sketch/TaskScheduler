/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEVEXTREME_LICENSE_KEY?: string
  readonly VITE_TASKSCHEDULER_APP_BASE_PATH?: string
  readonly VITE_TASKSCHEDULER_API_BASE_URL?: string
  readonly VITE_TASKSCHEDULER_HUB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}