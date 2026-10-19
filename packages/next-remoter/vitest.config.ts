import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

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
        find: '@opentiny/tiny-robot-svgs',
        replacement: resolve(__dirname, '../../node_modules/@opentiny/tiny-robot-svgs/dist/tiny-robot-svgs.js')
      }
    ]
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./test/setup.ts'],
    server: {
      deps: {
        inline: [/@opentiny\/.*/]
      }
    }
  }
})
