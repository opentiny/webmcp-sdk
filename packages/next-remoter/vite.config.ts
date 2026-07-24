import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'
import { visualizer } from 'rollup-plugin-visualizer'
import dts from 'vite-plugin-dts'
const __dirname = dirname(fileURLToPath(import.meta.url))

// 读取 package.json 中的依赖列表，构建时全部 external 化
// 库构建不应内联依赖，否则产物体积膨胀且消费方无法 tree-shake
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const externalDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {})
]

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
        }),
      dts({ tsconfigPath: './tsconfig.json' })
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
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'NextRemoter',
        formats: ['es', 'cjs'],
        // JS 文件保持原本的文件名称
        fileName: (format) => `next-remoter.${format}.js`
      },
      rollupOptions: {
        // external 策略：将 package.json 中声明的所有依赖外部化
        // CSS 文件不排除（需打包到 style.css）
        external: (id) => {
          if (id.endsWith('.css')) return false
          return externalDeps.some(dep => id === dep || id.startsWith(dep + '/'))
        },
        output: {
          // CSS 文件使用 style.css 作为文件名，其他资源保持默认命名
          assetFileNames: (assetInfo) => {
            // 通过检查文件扩展名判断是否为 CSS 文件
            // 使用字符串匹配来避免使用已弃用的 name 属性
            const fileName = assetInfo.names?.[0] || ''
            if (fileName.endsWith('.css')) {
              return 'style.css'
            }
            // 对于非 CSS 资源，返回默认命名模式
            return 'assets/[name]-[hash][extname]'
          }
        }
      }
    }
  }
})
