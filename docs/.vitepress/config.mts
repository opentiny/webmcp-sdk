import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'OpenTiny NEXT-SDKs',
  description: 'OpenTiny NEXT-SDKs',
  base: '/next-sdk/',
  vite: {
    server: {
      port: 3000
    }
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: 'logo.png',
    nav: [{ text: '指引', link: '/guide/', activeMatch: '/guide/' }],

    sidebar: {
      '/guide/': [
        {
          text: '介绍',
          items: [
            { text: '开始', link: '/guide/' },
            { text: '为什么选 NEXT-SDKs', link: '/guide/why' }
          ]
        },
        {
          text: '指引',
          items: [
            { text: '远程连接 WebAgent 服务器', link: '/guide/connect-web-agent' },
            { text: '通过 MCP Host 操控 Web 应用', link: '/guide/mcp-host' },
            { text: 'Electron 应用接入', link: '/guide/electron' },
            { text: 'uni-app 应用接入', link: '/guide/uni-app' },
            { text: '本地连接', link: '/guide/connect-local' },
            { text: '常见问题', link: '/guide/faq' }
          ]
        },
        {
          text: 'NEXT-SDKs API',
          items: [
            { text: 'WebMcpClient 类', link: '/guide/api-client' },
            { text: 'WebMcpServer 类', link: '/guide/api-server' },
            { text: 'AgentModelProvider 类', link: '/guide/api-agentModelProvider' },
            { text: 'createRemoter 函数', link: '/guide/api-createRemoter' },
            { text: '工具函数', link: '/guide/api-tools' }
          ]
        },
        {
          text: 'TinyRemoter for Vue',
          items: [{ text: 'TinyRobot版本', link: '/remoter-ui/tiny-robot-remoter' }]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny/next-sdk' }]
  }
})
