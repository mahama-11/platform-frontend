import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const platformProxyTarget = env.VITE_PLATFORM_PROXY_TARGET || 'http://localhost:8195'
  const menuProxyTarget = env.VITE_MENU_PROXY_TARGET || 'http://localhost:8196'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: platformProxyTarget,
          changeOrigin: true,
        },
        '/menu-api': {
          target: menuProxyTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/menu-api\/v1/, '/api/v1/menu'),
        },
        '/healthz': {
          target: platformProxyTarget,
          changeOrigin: true,
        },
        '/docs': {
          target: platformProxyTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
