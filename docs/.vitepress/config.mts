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
          items: [
            { text: '快速开始', link: '/guide/' },
            { text: '浏览器内置 WebMCP', link: '/guide/webmcp-article' }
          ]
        },
        {
          text: 'WebMCP&WebSkills 最佳实践',
          items: [
            { text: '总览', link: '/guide/webmcp-webskills' },
            { text: 'Vue 工程最佳实践', link: '/guide/vue-webmcp-best-practice' },
            { text: 'Angular 工程最佳实践', link: '/guide/angular-webmcp-best-practice' },
            { text: 'React 工程最佳实践', link: '/guide/react-webmcp-best-practice' }
          ]
        },
        {
          text: 'WebMCP CLI & Skills',
          items: [
            { text: 'WebMCP CLI 工具介绍', link: '/guide/webmcp-cli' },
            { text: '第三方 Agent 接入指南', link: '/guide/webmcp-agent-integration' }
          ]
        },
        {
          text: 'NEXT-SDKs API',
          items: [
            { text: 'WebMcpServer 类', link: '/guide/api-server' },
            { text: 'WebMcpClient 类', link: '/guide/api-client' },
            { text: 'AgentModelProvider 类', link: '/guide/api-agentModelProvider' },
            { text: 'createRemoter 函数', link: '/guide/api-createRemoter' },
            { text: '工具函数', link: '/guide/api-tools' }
          ]
        },
        {
          text: 'TinyRemoter 组件',
          items: [
            { text: '基本用法', link: '/guide/remoter/basic' },
            { text: '自定义LLM大模型指南', link: '/guide/remoter/custom-llm' },
            { text: '远程遥控模式指南', link: '/guide/remoter/remoter-mode' },
            { text: 'Mcp Server与工具指南', link: '/guide/remoter/mcp-server-tool' },
            { text: 'Skills 技能配置指南', link: '/guide/remoter/skills' }
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
