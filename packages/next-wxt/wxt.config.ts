import { defineConfig } from 'wxt'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'
import { mcpServersPlugin } from './plugins/vite-plugin-mcp-servers'
// import { vendorSdkPlugin } from './plugins/vite-plugin-vendor-sdk'
// import { codeRecorderPlugin } from './plugins/vite-plugin-code-recorder'
import { manifestOptionsPlugin } from './plugins/vite-plugin-manifest-options'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/auto-icons'],
  runner: {
    chromiumArgs: [
      '--disable-web-security', // 禁用 Web 安全策略
      '--user-data-dir=./.wxt/chrome-data' // 设置用户数据目录
    ]
  },
  manifest: {
    name: 'OpenTiny AI Extension',
    // 定义manifiest
    permissions: [
      'storage',
      'tabs',
      'activeTab',
      'scripting',
      'contextMenus',
      'userScripts',
      'notifications',
      'debugger',
      'downloads'
    ],
    host_permissions: ['*://*/*'], //  bg 发出 fecth, bg注入content脚本，访问 tab详情，cookie..
    action: {},
    // 配置 options 页面在新标签页中打开，而不是弹窗
    options_ui: {
      page: 'options.html',
      open_in_tab: true
    },
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
    build: {
      target: 'esnext'
    },
    esbuild: {
      target: 'esnext'
    },
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
      }) as any,
      // vendorSdkPlugin(), // 自动构建和更新 vendor/next-sdk.js 需要时打开
      mcpServersPlugin(), // 添加 mcp-servers 编译插件
      // codeRecorderPlugin(), // dev 环境录制生成工具写入支持 需要时打开
      manifestOptionsPlugin() // 确保 manifest.json 中 options_ui.open_in_tab 为 true（dev 和 build 模式）
    ]
  })
})
