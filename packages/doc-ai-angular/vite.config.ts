import { defineConfig } from 'vite'
import angular from '@analogjs/vite-plugin-angular'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dotenv from 'dotenv'

// https://vite.dev/config/
export default defineConfig(() => {
  dotenv.config({ path: '.env' })

  return {
    define: {
      'process.env': {
        TINY_USER_TOKEN: process.env.TINY_USER_TOKEN
      }
    },
    plugins: [
      // 只处理 Angular 的 .ts 文件（src/remoter/ 已在 tsconfig.app.json 中排除）
      angular({ tsconfig: './tsconfig.app.json' }),
      // 处理 remoter.html 入口中的 .vue 文件（由 Vite Vue 插件独立处理）
      vue()
    ],
    build: {
      rollupOptions: {
        // 双入口：主 Angular 应用 + iframe 中的 Vue TinyRemoter
        input: {
          main: resolve(__dirname, 'index.html'),
          remoter: resolve(__dirname, 'remoter.html')
        }
      }
    },
    server: {
      port: 8090,
      host: true,
      proxy: {
        '/api': {
          target: 'https://agent.opentiny.design',
          changeOrigin: true
        }
      }
    }
  }
})
