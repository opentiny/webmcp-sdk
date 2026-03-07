import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'
import importPlugin from '@opentiny/vue-vite-import'
import { resolve } from 'path'

/**
 * doc-ai-angular 的 Remoter 子包：独立 Vite 工程，仅负责 iframe 内的 Vue TinyRemoter。
 * 与 Angular 主应用完全解耦：Angular 用 ng serve，本包用 pnpm dev 单独起在 5179。
 * 配置对齐 next-remoter：TinyVue、Vant 按需解析与自动导入，SVG 作为组件。
 */
export default defineConfig({
  root: __dirname,
  define: {
    'process.env': { TINY_MODE: 'pc' }
  },
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
    importPlugin(
      {
        options: [
          {
            libraryName: '@opentiny/vue',
            split: '-'
          },
          {
            libraryName: '@opentiny/vue-icon',
            customName: (name: string) => `@opentiny/vue-icon/lib/${name.replace(/^icon-/, '')}.js`
          }
        ],
        mode: 'pc',
        exclude: [/test\.vue/]
      },
      'pc'
    )
  ],
  server: {
    port: 5179,
    strictPort: true,
    origin: 'http://localhost:5179'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  }
})
