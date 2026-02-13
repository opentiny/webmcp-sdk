import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dotenv from 'dotenv'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'

// https://vite.dev/config/
export default defineConfig(() => {
  // 加载 .env 文件中的环境变量
  dotenv.config({ path: '.env' })

  return {
    // 注入环境变量到前端代码
    define: {
      'process.env': {
        TINY_USER_TOKEN: process.env.TINY_USER_TOKEN
      }
    },
    plugins: [
      vue(),
      vueJsx(),
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
      port: 8089,
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
