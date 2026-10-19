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
    outline: {
      level: [2, 6],
      label: '页面导航'
    },
    sidebar: {
      '/': [
        // {
        //   text: '介绍',
        //   items: [
        //     { text: '快速开始', link: '/guide/quick-start' },
        //     { text: 'WebMCP API 文档', link: '/guide/webmcp-article' },
        //     { text: '适配场景 与 FAQ', link: '/guide/choose-scene' }
        //   ]
        // },
        // {
        //   text: 'WebMCP-SDKs API',
        //   items: [
        //     { text: '全局 API', link: '/webmcp-sdk/global-tools' },
        //     { text: 'registerPageAgentTool 函数', link: '/webmcp-sdk/page-agent-tool' },
        //     { text: 'enableInspectAssist 函数', link: '/webmcp-sdk/inspect-assist' },
        //     { text: 'WebMcpServer 类', link: '/webmcp-sdk/webmcp-server' },
        //     { text: 'WebMcpClient 类', link: '/webmcp-sdk/webmcp-client' },
        //     { text: 'createRemoter 函数', link: '/webmcp-sdk/create-remoter' }
        //   ]
        // },
        // {
        //   text: 'TinyRemoter 组件',
        //   items: [
        //     { text: '基本用法', link: '/remoter/basic' },
        //     { text: '自定义LLM大模型指南', link: '/remoter/custom-llm' },
        //     { text: '远程遥控模式指南', link: '/remoter/remoter-mode' },
        //     { text: 'Mcp Server与工具指南', link: '/remoter/mcp-server-tool' },
        //     { text: 'Skills 技能配置指南', link: '/remoter/skills' }
        //   ]
        // },
        // {
        //   text: 'WebMCP&WebSkills 最佳实践',
        //   items: [
        //     { text: '总览', link: '/best-practice/introduce' },
        //     { text: 'Vue 工程最佳实践', link: '/best-practice/vue-practice' },
        //     { text: 'Angular 工程最佳实践', link: '/best-practice/angular-practice' },
        //     { text: 'React 工程最佳实践', link: '/best-practice/react-practice' }
        //   ]
        // },
        // {
        //   text: 'WebMCP CLI & Skill',
        //   items: [
        //     { text: 'CLI 使用指南', link: '/webmcp-cli/webmcp-cli' },
        //     { text: 'Skill 使用指南', link: '/webmcp-cli/webmcp-cli-skill' }
        //   ]
        // },
        {
          text: 'TinyRobot AI助手',
          items: [
            { text: '快速入门', link: '/ai-extension/quick-start' },
            {
              text: '安装指南',
              link: '/ai-extension/install.md'
            },
            {
              text: '使用指南',
              items: [
                { text: '界面说明', link: '/ai-extension/introduce' },
                { text: '注册与登录', link: '/ai-extension/introduce' },
                { text: '扩展与MCP', link: '/ai-extension/introduce' }
              ]
            },
            {
              text: '配置指南',
              items: [
                {
                  text: '功能管理',
                  link: '/ai-extension/introduce',
                  collapsed: true,
                  items: [
                    { text: '内置功能', link: '/ai-extension/introduce' },
                    { text: '右键 AI 总结', link: '/ai-extension/introduce' },
                    { text: 'DOM 元素选取', link: '/ai-extension/introduce' },
                    { text: '内容助手', link: '/ai-extension/introduce' },
                    { text: 'CLI WebSocket 桥接', link: '/ai-extension/introduce' },
                    { text: '导出为 Markdown', link: '/ai-extension/introduce' }
                  ]
                },
                { text: '模型设置', link: '/ai-extension/introduce' },
                { text: '悬浮球设置', link: '/ai-extension/introduce' },
                { text: 'Skill管理', link: '/ai-extension/introduce' },
                { text: 'WebMCP管理', link: '/ai-extension/introduce' },
                { text: '数据管理', link: '/ai-extension/introduce' }
              ]
            }
          ]
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/opentiny' }]
  }
})
