import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'
import { visualizer } from 'rollup-plugin-visualizer'
const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isVisualizer = mode === 'visualizer'
  return {
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
      }),
      isVisualizer &&
        visualizer({
          open: true,
          filename: 'stats.html'
        })
    ],
    build: {
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'NextRemoterRuntime',
        formats: ['es'],
        fileName: () => `next-remoter-runtime.es.js`
      },
      rollupOptions: {
        external: ['vue', '@opentiny/vue', '@opentiny/vue-icon']
      }
    }
  }
})
