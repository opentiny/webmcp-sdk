import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/remoter': {
        target: 'http://localhost:5179',
        changeOrigin: true,
      },
    },
  },
})
