import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.')
    }
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**', '.output/**', '.wxt/**']
  }
})
