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

function toChunkSegment(value: string) {
  return value
    .replace(/\.js$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function resolveVendorChunk(id: string) {
  const normalizedId = id.replace(/\\/g, '/')

  if (!normalizedId.includes('node_modules')) {
    return undefined
  }

  if (normalizedId.includes('/devextreme-aspnet-data-nojquery/')) {
    return 'vendor-dx-aspnet'
  }

  if (normalizedId.includes('/devextreme-react/')) {
    const marker = '/devextreme-react/'
    const segmentStart = normalizedId.indexOf(marker)
    const relativePath = normalizedId.slice(segmentStart + marker.length)
    const normalizedPath = relativePath
      .replace(/^esm\//i, '')
      .replace(/^cjs\//i, '')
    const [moduleName] = normalizedPath.split('/')
    const chunkSegment = toChunkSegment(moduleName || 'core')
    return `vendor-dx-react-${chunkSegment}`
  }

  const internalGridsMatch = normalizedId.match(/\/devextreme\/(?:esm\/|cjs\/)?(?:__)?internal\/grids(?:\/([^/]+)|\.js)/i)
  if (internalGridsMatch) {
    return `vendor-dx-internal-grids-${toChunkSegment(internalGridsMatch[1] || 'core')}`
  }

  const internalFilterBuilderMatch = normalizedId.match(/\/devextreme\/(?:esm\/|cjs\/)?(?:__)?internal\/filter-builder(?:\/([^/]+)|\.js)/i)
  if (internalFilterBuilderMatch) {
    return `vendor-dx-internal-filter-builder-${toChunkSegment(internalFilterBuilderMatch[1] || 'core')}`
  }

  if (normalizedId.includes('/devextreme/')) {
    const marker = '/devextreme/'
    const segmentStart = normalizedId.indexOf(marker)
    const relativePath = normalizedId.slice(segmentStart + marker.length)
    const normalizedPath = relativePath
      .replace(/^esm\//i, '')
      .replace(/^cjs\//i, '')
    const [scope, moduleName, featureName] = normalizedPath.split('/')

    if (
      (scope === 'internal' || scope === 'common')
      && moduleName
      && featureName
    ) {
      return `vendor-dx-${toChunkSegment(scope)}-${toChunkSegment(moduleName)}-${toChunkSegment(featureName)}`
    }

    if (scope && moduleName && scope !== 'dist') {
      return `vendor-dx-${toChunkSegment(scope)}-${toChunkSegment(moduleName)}`
    }

    if (scope) {
      return `vendor-dx-${toChunkSegment(scope)}`
    }
  }

  if (normalizedId.includes('/react-router-dom/')) {
    return 'vendor-react-router'
  }

  if (normalizedId.includes('/react-dom/') || normalizedId.includes('/react/')) {
    return 'vendor-react'
  }

  if (normalizedId.includes('/@microsoft/signalr/')) {
    return 'vendor-signalr'
  }

  return 'vendor-misc'
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: normalizeAssetBasePath(env.VITE_TASKSCHEDULER_APP_BASE_PATH),
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 950,
      rolldownOptions: {
        output: {
          manualChunks(id) {
            return resolveVendorChunk(id)
          },
        },
      },
    },
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
