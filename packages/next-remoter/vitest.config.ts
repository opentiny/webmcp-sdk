import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

export default defineConfig({
  plugins: [
    vue(),
    svgLoader({
      defaultImport: 'component',
      svgo: false
    })
  ],
  resolve: {
    alias: [
      {
        find: /^@opentiny\/tiny-robot-svgs$/,
        replacement: require.resolve('@opentiny/tiny-robot-svgs/dist/tiny-robot-svgs.js')
      }
    ]
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    server: {
      deps: {
        inline: [/@opentiny\//]
      }
    },
    include: ['test/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**', 'test/setup.ts']
  }
})
