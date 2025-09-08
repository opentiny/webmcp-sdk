import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'
import { visualizer } from 'rollup-plugin-visualizer'
import importPlugin from '@opentiny/vue-vite-import'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isVisualizer = mode === 'visualizer'
  return {
    base: '/next-remoter/',
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
              split: '-' // 自定义分隔符
            },
            {
              libraryName: '@opentiny/vue-icon',
              customName: (name) => {
                // 自定义模块名称
                return `@opentiny/vue-icon/lib/${name.replace(/^icon-/, '')}.js`
              }
            }
          ],
          mode: 'pc', // mode可选，表示只打包pc或者移动模板 pc | mobile | undefined
          exclude: [/test\.vue/] // 可选，表示需要剔除掉的文件
        },
        'pc'
      ),
      isVisualizer &&
        visualizer({
          open: true,
          filename: 'stats.html'
        })
    ]
  }
})
