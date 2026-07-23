import { defineConfig } from 'vite'

export default defineConfig(() => {
  return {
    define: {
      'process.env.NODE_ENV': JSON.stringify('production')
    },
    build: {
      emptyOutDir: false,
      lib: {
        entry: 'runtime.ts',
        name: 'WebMCPSDK',
        formats: ['iife', 'es'],
        fileName: (format) => format === 'es' ? 'runtime.es.js' : 'runtime.js'
      },
      rollupOptions: {
        // 全量打包第三方依赖，便于浏览器中直接注入或运行
        external: []
      }
    }
  }
})
