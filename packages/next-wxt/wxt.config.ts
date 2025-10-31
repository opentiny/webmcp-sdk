import { defineConfig } from 'wxt'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    // 定义manifiest
    permissions: ['storage', 'tabs', 'scripting', 'contextMenus', 'userScripts', 'notifications'],
    host_permissions: ['*://*/*'], //  bg 发出 fecth, bg注入content脚本，访问 tab详情，cookie..
    action: {},
    web_accessible_resources: [
      {
        resources: ['vendor/next-sdk.js'],
        matches: ['*://*/*']
      }
    ]
  },
  vite: () => ({
    plugins: [
      Components({
        resolvers: [TinyVueSingleResolver, VantResolver()]
      }),
      AutoImport({
        resolvers: [TinyVueSingleResolver, VantResolver()]
      }),
      svgLoader({
        defaultImport: 'component',
        svgo: false
      }) as any
    ],
    build: {
      minify: false
    }
  })
})
