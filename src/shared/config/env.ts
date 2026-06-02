type RuntimeEnv = Partial<Record<string, string>>

const runtimeEnv: RuntimeEnv =
  typeof window === 'undefined'
    ? {}
    : ((window as Window & { __ENV__?: RuntimeEnv }).__ENV__ ?? {})

const getEnv = (key: string, fallback = '') => runtimeEnv[key] || import.meta.env[key] || fallback

const getBooleanEnv = (key: string, fallback = false) => {
  const value = getEnv(key)
  if (!value) return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export const env = {
  apiBaseUrl: getEnv('VITE_PLATFORM_API_BASE_URL', '/api/v1'),
  menuApiBaseUrl: getEnv('VITE_MENU_API_BASE_URL', '/menu-api/v1'),
  logExplorerUrl: getEnv('VITE_LOG_EXPLORER_URL'),
  traceExplorerUrl: getEnv('VITE_TRACE_EXPLORER_URL'),
  traceBackendEnabled: getBooleanEnv('VITE_TRACE_BACKEND_ENABLED'),
}
