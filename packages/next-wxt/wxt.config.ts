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
      'debugger',
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
        // next-sdk runtime + 显式注册脚本 + 用户 MCP 执行桥（content 经 <script src> 注入 MAIN world）
        // 顺序由 content.ts 保证：runtime → register-page-agent-tool → user-mcp-exec → background bind/exec
        resources: [
          'vendor/runtime.js',
          'vendor/register-page-agent-tool.js',
          'vendor/user-mcp-exec.js'
        ],
        matches: ['*://*/*']
      },
      {
        // mcp-servers 目录下的工具脚本（由 content.ts 经 <script src> 注入 MAIN world）
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
