import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'OpenTiny WebMCP-SDKs',
  description: 'OpenTiny WebMCP-SDKs',
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
    nav: [{ text: '指引', link: '/guide/quick-start', activeMatch: '/guide/quick-start' }],

    sidebar: {
      '/': [
        {
          text: '介绍',
          items: [
            { text: '快速开始', link: '/guide/quick-start' },
            { text: 'WebMCP API 文档', link: '/guide/webmcp-article' },
            { text: '适配场景 与 FAQ', link: '/guide/choose-scene' }
          ]
        },
        {
          text: 'WebMCP-SDKs API',
          items: [
            { text: '全局 API', link: '/webmcp-sdk/global-tools' },
            { text: 'registerPageAgentTool 函数', link: '/webmcp-sdk/page-agent-tool' },
            { text: 'WebMcpServer 类', link: '/webmcp-sdk/webmcp-server' },
            { text: 'WebMcpClient 类', link: '/webmcp-sdk/webmcp-client' },
            { text: 'createRemoter 函数', link: '/webmcp-sdk/create-remoter' }
          ]
        },
        {
          text: 'TinyRemoter 组件',
          items: [
            { text: '基本用法', link: '/remoter/basic' },
            { text: '自定义LLM大模型指南', link: '/remoter/custom-llm' },
            { text: '远程遥控模式指南', link: '/remoter/remoter-mode' },
            { text: 'Mcp Server与工具指南', link: '/remoter/mcp-server-tool' },
            { text: 'Skills 技能配置指南', link: '/remoter/skills' }
          ]
        },
        {
          text: 'WebMCP&WebSkills 最佳实践',
          items: [
            { text: '总览', link: '/best-pratice/introduce' },
            { text: 'Vue 工程最佳实践', link: '/best-pratice/vue-practice' },
            { text: 'Angular 工程最佳实践', link: '/best-pratice/angular-practice' },
            { text: 'React 工程最佳实践', link: '/best-pratice/react-practice' }
          ]
        },
        {
          text: 'WebMCP CLI & Skill',
          items: [
            { text: 'CLI 使用指南', link: '/webmcp-cli/webmcp-cli' },
            { text: 'Skill 使用指南', link: '/webmcp-cli/webmcp-cli-skill' }
          ]
        },
        {
          text: 'AI Extension',
          items: [
            { text: '快速入门', link: '/ai-extension/install' },
            { text: '配置大模型', link: '/ai-extension/model-config' },
            { text: 'MCP工具开发指南', link: '/ai-extension/next-wxt' },
            { text: 'Skills 技能开发指南', link: '/ai-extension/skills' },
            { text: '工作原理', link: '/ai-extension/architecture' }
          ]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny' }]
  }
})
