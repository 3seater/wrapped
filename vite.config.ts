import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api/cielo': {
        target: 'https://feed-api.cielo.finance',
        changeOrigin: true,
        rewrite: (path) => {
          // Rewrite /api/cielo to /api/v1/feed
          return path.replace(/^\/api\/cielo/, '/api/v1/feed');
        },
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Parse the request URL to extract query params
            const url = new URL(req.url || '', 'http://localhost:5175');
            const apiKey = url.searchParams.get('apiKey');
            
            // Add API key as header (per Cielo docs: https://developer.cielo.finance/reference/getfeed)
            if (apiKey) {
              proxyReq.setHeader('X-API-KEY', apiKey);
              proxyReq.setHeader('accept', 'application/json');
              
              // Remove apiKey from query string (we're sending it as header)
              url.searchParams.delete('apiKey');
              
              // Update the proxy request path without apiKey
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
})
