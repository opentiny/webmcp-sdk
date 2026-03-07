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
 * 仅用于开发/构建 iframe 内的 Vue TinyRemoter。
 * 配置对齐 next-remoter 的 vite.remoter.config.ts：TinyVue、Vant 按需解析与自动导入，SVG 作为组件。
 * ng serve 通过 proxy.conf.json 将 /remoter.html 和 /src/remoter 代理到本服务（端口 5174）。
 */
export default defineConfig({
  root: '.',
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
    port: 5174,
    strictPort: true,
    origin: 'http://localhost:5174'
  },
  build: {
    outDir: 'dist/remoter',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        remoter: resolve(__dirname, 'remoter.html')
      }
    }
  }
})
