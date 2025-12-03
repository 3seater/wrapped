import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      // Proxy for Cielo aggregated PNL endpoint
      '/api/cielo/pnl': {
        target: 'https://feed-api.cielo.finance',
        changeOrigin: true,
        rewrite: (path) => {
          // Rewrite /api/cielo/pnl to /api/v1
          return path.replace(/^\/api\/cielo\/pnl/, '/api/v1');
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Get API key from environment (server-side)
            const apiKey = env.VITE_CIELO_API_KEY;
            console.log('[Proxy] Cielo PNL Request:', {
              path: req.url,
              hasApiKey: !!apiKey,
              apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : 'NOT FOUND'
            });
            if (apiKey) {
              proxyReq.setHeader('X-API-KEY', apiKey);
              proxyReq.setHeader('accept', 'application/json');
            } else {
              console.error('[Proxy] WARNING: VITE_CIELO_API_KEY not found in environment!');
            }
          });
        },
      },
      // Proxy for Cielo token PNL endpoint (tRPC)
      '/api/cielo/trpc': {
        target: 'https://app.cielo.finance',
        changeOrigin: true,
        rewrite: (path) => {
          // Rewrite /api/cielo/trpc to /api/trpc
          return path.replace(/^\/api\/cielo\/trpc/, '/api/trpc');
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            proxyReq.setHeader('accept', 'application/json');
          });
        },
      },
      // Legacy proxy for feed endpoint (keeping for backwards compatibility)
      '/api/cielo': {
        target: 'https://feed-api.cielo.finance',
        changeOrigin: true,
        rewrite: (path) => {
          return path.replace(/^\/api\/cielo/, '/api/v1/feed');
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const url = new URL(req.url || '', 'http://localhost:5175');
            const apiKey = url.searchParams.get('apiKey') || env.VITE_CIELO_API_KEY;
            
            if (apiKey) {
              proxyReq.setHeader('X-API-KEY', apiKey);
              proxyReq.setHeader('accept', 'application/json');
              
              url.searchParams.delete('apiKey');
              const newPath = url.pathname.replace('/api/cielo', '/api/v1/feed') + (url.search || '');
              proxyReq.path = newPath;
            }
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  }
})
