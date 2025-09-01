import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [TinyVueSingleResolver, VantResolver()]
    }),
    AutoImport({
      resolvers: [TinyVueSingleResolver, VantResolver()]
    }),
    svgLoader({
      defaultImport: 'component',
      svgo: false
    })
  ],
  server: {
    port: 8087,
    host: true,
    proxy: {
      '/api': {
        target: 'https://agent.opentiny.design',
        changeOrigin: true
      }
    }
  },
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'NextRemoter',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `next-remoter.${format}.js`
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})
