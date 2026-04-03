# OpenTiny NEXT-SDKs: 内置 WebMCP & Polyfill + WebSkills + WebAgent

[English](README.md) | 简体中文

<p align="center">
  <strong>一套前端智能应用开发工具包。通过内置 WebMCP 协议，让你的应用瞬间拥有 AI-Native 能力。</strong>
</p>

<p align="center">
  <a href="https://docs.opentiny.design/next-sdk/">📖 文档</a> |
  <a href="#-快速开始">🚀 快速开始</a> |
  <a href="#-webmcp--polyfill">🌐 WebMCP & Polyfill</a> |
  <a href="#-使用场景">💡 使用场景</a>
</p>

> [!IMPORTANT]
> **下一代 AI 协议**：OpenTiny NEXT-SDKs 基于 **WebMCP (Model Context Protocol for Web)** 构建。它全面兼容原生 `navigator.modelContext` API（目前在 Chrome 等浏览器中处于实验阶段），允许你的 Web 应用通过标准化协议被 AI 操控。

---

**OpenTiny NEXT-SDKs** 是一套前端智能应用开发工具包。它通过「WebMCP + WebSkills」模式，将页面操作、数据查询和业务流程封装为标准化工具。通过使用我们的 **Polyfill**，你可以在当下的浏览器中提前构建面向未来的 AI-Native 应用，且**几乎无需重构**。

## 📑 目录

- [✨ 主要特性](#-主要特性)
- [🌐 WebMCP & Polyfill](#-webmcp--polyfill)
- [🚀 快速开始](#-快速开始)
- [📦 核心包说明](#-核心包说明)
- [💡 核心概念](#-核心概念)
- [📖 使用场景](#-使用场景)
- [🛠️ 参与开发](#️-参与开发)
- [📄 许可证](#-许可证)

## ✨ 主要特性

- 🔌 **标准 WebMCP 实现**：完整实现 MCP 协议的浏览器版本，通过统一协议让前端变得“可被 AI 调用”。
- 📡 **远程 AI 操控**：通过对接 **WebAgent 服务**，让 AI 能够轻松、稳定地远程调起和指挥你的前端工具，实现跨时空的“遥控”。
- 🛠️ **内置 Polyfill 支持**：为当前浏览器提供 `navigator.modelContext` 补丁，确保代码在今天可用，并随浏览器的更新无缝切换至原生支持。
- 🎯 **零改造智能化**：像定义 API 一样定义工具，无需改变应用核心架构即可暴露业务逻辑和 UI 操作。
- 🧩 **WebSkills 抽象**：以“业务技能”方式组织工具，实现能力的渐进式披露。
- 🤖 **AI 对话组件**：提供开箱即用的 `@opentiny/next-remoter`，瞬间拥有 AI 遥控器。

## 🌐 WebMCP & Polyfill

### 什么是 WebMCP？

WebMCP 是 Model Context Protocol 在浏览器端的扩展。它定义了网页如何向 AI 代理提供“工具”和“资源”。在不久的将来，浏览器将提供原生的 `navigator.modelContext` 对象来统一管理这些能力。

### 为什么需要 Polyfill？

由于原生 API 仍处于实验阶段，**OpenTiny NEXT-SDKs 提供了一套强大的 Polyfill**。通过调用 `initializeBuiltinWebMCP()`，SDK 会：

1.  **注入 `navigator.modelContext`**：提供符合标准规范的工具注册接口。
2.  **自动化路由与桥接**：自动处理不同页面路径、iframe 之间的消息同步与工具调用导航。

这意味着你今天编写的标准 WebMCP 代码，在未来浏览器原生支持时将自动平滑切换到原生引擎。

### 📡 通过 WebAgent 实现远程操控

OpenTiny NEXT-SDKs 的最大亮点之一是在于通过 **WebAgent** 实现页面的“可控性”。通过使用 `WebMcpClient`，你可以：

- **获取持久化的 Session ID**：与云端 AI 编排器建立长效连接。
- **跨时空协同**：即使用户不在当前聊天窗口前，AI 也可以根据业务指令远程调用页面工具。
- **高阶业务自动化**：配合 WebAgent，将页面上的工具转化为自动化流程中的执行单元，真正实现 AI 对应用的“远程驾驶”。

#### 连接示例

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient()

// 连接至 WebAgent 服务
const { sessionId } = await client.connect({
  agent: true,
  builtin: true, // 启用内置 WebMCP 代理
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})

console.log('连接成功！会话 ID:', sessionId)
// 现在，你的应用已经可以通过此 sessionId 被远程操控
```

> [!TIP]
> 上述 URL 是由 OpenTiny 提供的公开测试服务器，仅用于测试。在生产环境中，我们建议您部署自己的 WebAgent 服务。
> 源码地址：[https://github.com/opentiny/web-agent](https://github.com/opentiny/web-agent)

## 🚀 快速开始

只需几行代码，即可让你的前端应用具备 AI 能力。

### 第一步：安装依赖

```bash
npm install @opentiny/next-sdk
```

### 第二步：初始化 WebMCP Polyfill（推荐）

在你的应用入口文件（如 `main.ts` 或 `app.js`）中添加以下代码：

```typescript
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

// 初始化 Polyfill 与 桥接机制
initializeBuiltinWebMCP()
```

### 第三步：使用标准 API 注册工具

现在，你可以在应用的任何地方使用标准的 `navigator.modelContext` 来注册工具：

```typescript
// 注册一个可被 AI 调用的工具
navigator.modelContext.registerTool({
  name: 'get_user_info',
  description: '获取当前用户信息',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' }
    }
  },
  handler: async (args) => {
    // 这里编写你的业务逻辑
    return { content: [{ type: 'text', text: `用户 ${args.userId} 的信息...` }] }
  }
})
```

✅ **完成！** 你的应用现在就是一个 MCP 服务。
你可以将其连接到任何 MCP 兼容的客户端，或使用我们的 [TinyRemoter](#-添加-ai-遥控器可选) 直接与应用对话。

---

### 备选方案：自定义 MCP Server（高级）

如果你需要更深层次的控制或运行多个独立服务：

```typescript
import { WebMcpServer, z } from '@opentiny/next-sdk'

const server = new WebMcpServer({ name: 'custom-server', version: '1.0.0' })

server.registerTool(
  'demo',
  {
    title: '演示工具',
    inputSchema: { foo: z.string() }
  },
  async (params) => {
    return { content: [{ type: 'text', text: `结果: ${params.foo}` }] }
  }
)

// 连接到任意传输通道...
```

## 📦 核心包说明

### @opentiny/next-sdk（当前包）

核心 SDK 包，提供：

- **内置 WebMCP Polyfill**：注入 `navigator.modelContext` 并建立桥接机制，实现 AI 与页面的无缝通信。
- **WebMcpServer**：受管 MCP 服务端，用于完全控制服务生命周期与传输层。
- **WebMcpClient**：MCP 客户端，用于连接 WebAgent 或其他远程服务。
- **WebAgent**：高层级智能代理编排逻辑。
- **Transport 传输层**：支持 MessageChannel、SSE、HTTP 以及 Chrome 插件通信。

### @opentiny/next-remoter

基于 TinyRobot 的 Vue3 AI 对话组件，提供：

- 集成的 AI 助手 UI。
- MCP 插件市场。
- 动态 WebSkills 发现与执行能力。

---

## 💡 核心概念

### WebMCP 桥接架构 (Bridge Architecture)

与传统的后端 MCP 不同，WebMCP 专注于 **浏览器上下文 (Browser Context)**。

```text
┌─────────────────────────────────────────────────────────────┐
│                       Web 浏览器                              │
│  ┌──────────────────┐              ┌───────────────────┐    │
│  │  前端应用         │◄── 桥接机制 ──►│   AI 助手          │    │
│  │ (WebMCP服务端)    │              │   (MCP客户端)      │    │
│  └──────────────────┘              └───────────────────┘    │
│           ▲                                  │              │
└───────────┼──────────────────────────────────┼──────────────┘
            │          (标准通信协议)           │
            └──────────────────────────────────┘
```

1.  **注册工具**：通过 `navigator.modelContext.registerTool` 声明你的应用具备哪些能力。
2.  **桥接同步**：我们的桥接机制会自动将 AI 请求路由到正确的页面或 iframe，即使用户已经切换了页面。
3.  **直接执行**：工具直接在页面环境下运行，可以访问 DOM、组件状态和本地 API。

### WebMcpServer

WebMcpServer 是 MCP 服务端的实现，用于手动管理前端应用的功能声明。

### WebMcpClient

WebMcpClient 是 MCP 客户端的实现，用于连接 WebAgent 服务和其他 MCP 服务。

## 📖 使用场景

- **🤝 智能客服**：快速搭建支持工具调用的 AI 客服系统
- **📚 文档助手**：为文档网站添加智能问答功能
- **🛠️ 开发工具**：构建支持代码生成、分析的开发辅助工具
- **🌐 浏览器扩展**：开发具有 AI 能力的浏览器插件
- **🏢 企业应用**：为企业应用添加智能化能力
- **📊 数据分析**：构建智能数据分析和可视化应用
- **✍️ 内容创作**：开发 AI 辅助的内容创作工具

## 🛠️ 参与开发

我们欢迎所有形式的贡献！无论是报告 Bug、提出新功能、改进文档还是提交代码，都非常感谢。

### 环境要求

在开始开发之前，请确保你的环境满足以下要求：

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git** 最新版本

### 获取代码

```bash
# 克隆项目
git clone https://github.com/opentiny/next-sdk.git
cd next-sdk

# 安装依赖
pnpm install
```

## 📚 相关资源

### 官方文档

- [OpenTiny NEXT-SDKs 官方文档](https://docs.opentiny.design/next-sdk/)
- [TinyRobot Remoter 组件文档](https://docs.opentiny.design/next-sdk/guide/tiny-robot-remoter.html)
- [API 参考文档](https://docs.opentiny.design/next-sdk/api/)

### 相关项目

- [OpenTiny](https://github.com/opentiny) - OpenTiny 组织主页
- [TinyVue](https://github.com/opentiny/tiny-vue) - 企业级 Vue 组件库
- [TinyEngine](https://github.com/opentiny/tiny-engine) - 低代码引擎
- [TinyRobot](https://github.com/opentiny/tiny-robot) - AI 对话组件

### WebMCP + WebSkills 最佳实践工程

推荐直接参考以下示例项目，按你使用的技术栈克隆或对照实现：

| 技术栈      | 示例工程                                  | 说明                                                                |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------- |
| **Vue**     | [doc-ai](packages/doc-ai)                 | Vue3 + Vite，本地 WebMCP / Polyfill 模式的最佳实践                  |
| **Angular** | [doc-ai-angular](packages/doc-ai-angular) | Angular 主应用 + iframe Remoter，通过 MessageChannel 与 WebMCP 打通 |
| **React**   | [doc-ai-react](packages/doc-ai-react)     | React 主应用 + iframe Remoter，与 Vue 版类似的 WebMCP 架构          |

配套文档：

- [Vue 集成 WebMCP 最佳实践](docs/guide/vue-webmcp-best-practice.md)
- [Angular 集成 WebMCP 最佳实践](docs/guide/angular-webmcp-best-practice.md)

---

## 📄 许可证

[MIT](https://github.com/opentiny/next-sdk/blob/main/LICENSE)

Copyright (c) 2024-present OpenTiny Team

## 🙏 致谢

感谢所有为 OpenTiny NEXT-SDKs 项目做出贡献的开发者！

[![contributors](https://contrib.rocks/image?repo=opentiny/next-sdk)](https://github.com/opentiny/next-sdk/graphs/contributors)
