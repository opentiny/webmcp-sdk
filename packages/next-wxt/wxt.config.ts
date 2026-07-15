import { defineConfig } from 'wxt'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'
import { mcpServersPlugin } from './plugins/vite-plugin-mcp-servers'
import { manifestOptionsPlugin } from './plugins/vite-plugin-manifest-options'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/auto-icons'],
  runner: {
    chromiumArgs: [
      '--disable-web-security', // 允许跨域请求，开发时使用，生产环境请谨慎使用
      '--user-data-dir=./.wxt/chrome-data' // 设置用户数据目录
    ]
  },
  manifest: {
    name: 'OpenTiny AI Extension',
    // 定义manifest
    permissions: [
      'storage',
      'tabs',
      'activeTab',
      'scripting',
      'contextMenus',
      'notifications',
      'debugger',
      'downloads',
      'sidePanel'
    ],
    host_permissions: ['*://*/*'],
    action: {
      default_title: 'Web Agent 遥控器'
    },
    // 配置 options 页面在新标签页中打开，而不是弹窗
    options_ui: {
      page: 'options.html',
      open_in_tab: true
    },
    side_panel: {
      default_path: 'sidepanel.html'
    },
    web_accessible_resources: [
      {
        // next-sdk runtime 包（仅暴露 API，由调用方传入配置后 registerPageAgentTool）
        resources: ['vendor/runtime.js'],
        matches: ['*://*/*']
      },
      {
        // mcp-servers 目录下的工具脚本（由 content.ts 通过 scripting.executeScript 注入）
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
      mcpServersPlugin(), // 添加 mcp-servers 编译插件
      manifestOptionsPlugin() // 确保 manifest.json 中 options_ui.open_in_tab 为 true（dev 和 build 模式）
    ]
  })
})
