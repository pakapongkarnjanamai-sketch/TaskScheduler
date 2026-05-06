import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeAssetBasePath(value: string | undefined) {
  const trimmedValue = value?.trim()

  if (!trimmedValue || trimmedValue === '/') {
    return '/'
  }

  const withLeadingSlash = trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: normalizeAssetBasePath(env.VITE_TASKSCHEDULER_APP_BASE_PATH),
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://localhost:7253',
          changeOrigin: true,
          secure: false,
        },
        '/taskHub': {
          target: 'https://localhost:7253',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
