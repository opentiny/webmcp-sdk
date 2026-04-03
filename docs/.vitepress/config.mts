import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'OpenTiny NEXT-SDKs',
  description: 'OpenTiny NEXT-SDKs',
  base: '/webmcp-sdk/',
  ignoreDeadLinks: [/^http:\/\/localhost:/],
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
          items: [{ text: '开始', link: '/guide/' }]
        },
        {
          text: '指引',
          items: [
            { text: '接入三方 AI 应用', link: '/guide/mcp-host' },
            { text: 'Electron 应用接入', link: '/guide/electron' },
            { text: 'uni-app 应用接入', link: '/guide/uni-app' },
            { text: '本地连接', link: '/guide/connect-local' },
            { text: 'WebAgent 私有化部署', link: '/guide/web-agent-private-deployment' }
          ]
        },
        {
          text: 'WebMCP&WebSkills 最佳实践',
          items: [
            { text: '总览', link: '/guide/webmcp-webskills' },
            { text: 'Vue 工程最佳实践', link: '/guide/vue-webmcp-best-practice' },
            { text: 'Angular 工程最佳实践', link: '/guide/angular-webmcp-best-practice' },
            { text: 'React 工程最佳实践', link: '/guide/react-webmcp-best-practice' },
            { text: '浏览器内置 WebMCP', link: '/guide/webmcp-article' }
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
          items: [
            { text: 'TinyRobot 版本', link: '/guide/tiny-robot-remoter' },
            { text: 'Skills 技能配置指南', link: '/guide/tiny-remoter-skills' },
            { text: 'Custom llm 自定义大模型', link: '/guide/custom-llm' },
            { text: '自定义AI对话框组件', link: '/guide/use-next-agent' }
          ]
        },
        {
          text: 'AI Extension',
          items: [
            { text: '技术架构', link: '/guide/ai-extension-architecture' },
            { text: 'MCP Servers 工具开发指南', link: '/guide/ai-extension-next-wxt' },
            { text: 'Skills 技能开发指南', link: '/guide/ai-extension-skills' },
            { text: 'AI Extension 插件安装指南', link: '/guide/ai-extension-install' },
            { text: '配置大模型', link: '/guide/ai-extension-model-config' }
          ]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny' }]
  }
})
