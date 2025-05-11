import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devtoolsSourcemapsPlugin from './plugins/devtools-sourcemaps'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    devtoolsSourcemapsPlugin()
  ],
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    sourcemap: true
  }
})
