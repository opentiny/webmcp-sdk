import { defineConfig } from 'wxt'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/auto-icons'],
  runner: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'] // 设置用户数据目录
  },
  manifest: {
    name: 'OpenTiny AI Extension',
    // 定义manifiest
    permissions: ['storage', 'tabs', 'activeTab', 'scripting', 'contextMenus', 'userScripts', 'notifications'],
    host_permissions: ['*://*/*'], //  bg 发出 fecth, bg注入content脚本，访问 tab详情，cookie..
    action: {},
    web_accessible_resources: [
      {
        resources: ['vendor/next-sdk.js', 'vendor/mcp-server.js'],
        matches: ['*://*/*']
      },
      {
        resources: ['mcp-servers/*/index.js'],
        matches: ['*://*/*']
      }
    ]
  },
  vite: () => ({
    envDir: './env',
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
    ]
  })
})
