import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig(() => {
  // 需要排除的第三方依赖列表
  const externalDependencies = [
    '@modelcontextprotocol/sdk',
    '@opentiny/next',
    '@ai-sdk/openai',
    '@ai-sdk/deepseek',
    '@ai-sdk/provider',
    'qrcode',
    'zod',
    'ajv',
    'ai'
  ]

  return {
    plugins: [
      // 配置 dts 插件生成类型声明文件
      dts({
        // 指定 TypeScript 配置文件路径
        tsconfigPath: './tsconfig.json',
        outDir: 'dist',
        // 包含所有 TypeScript 文件，确保所有被引用的文件都被处理
        include: ['**/*.ts'],
        exclude: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts'],
        // 不合并类型文件，保持文件结构以便相对路径引用正常工作
        rollupTypes: false,
        // 插入类型入口文件引用
        insertTypesEntry: true
      })
    ],
    build: {
      emptyOutDir: false,
      lib: {
        entry: {
          index: 'index.ts',
          core: 'core.ts'
        },
        name: 'NEXT-SDK',
        formats: ['es'],
        fileName: (format, entryName) => `${entryName}.js`,

        // -------  打包 page-agent 光标组件，需要把 css, svg 等资源内联  -------
        assetsInlineLimit: 4096, // 小于 4KB 的资源自动内联为 base64
        cssCodeSplit: false // 确保 CSS 被打包到 JS 中
      },
      css: {
        modules: {
          localsConvention: 'camelCase'
        }
      },
      // ---------  把 css, svg 等资源内联结束  ---------
      rollupOptions: {
        // 排除第三方依赖，保留本地文件
        external: (id) => {
          // 如果是相对路径导入（本地文件），不排除
          if (id.startsWith('.') || id.startsWith('/')) {
            return false
          }
          // 排除 node_modules 中的第三方依赖
          if (id.includes('node_modules')) {
            return true
          }
          // 排除指定的第三方依赖包
          return externalDependencies.some((dep) => id === dep || id.startsWith(`${dep}/`))
        }
      }
    }
  }
})
