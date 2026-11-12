import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: ['web'],
    watch: { usePolling: process.env.WATCH_POLLING !== 'false', interval: 500 },
    proxy: { '/api': { target: process.env.API_PROXY_TARGET || 'http://api:8080', changeOrigin: true } },
  },
})
