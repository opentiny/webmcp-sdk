# OpenTiny NEXT-SDKs

<p align="center">
  <strong>一套前端智能应用开发工具包，让你的应用瞬间拥有 AI 能力</strong>
</p>

<p align="center">
  <a href="https://docs.opentiny.design/next-sdk/">📖 文档</a> |
  <a href="#-快速开始">🚀 快速开始</a> |
  <a href="#-使用场景">💡 使用场景</a> |
  <a href="#️-参与开发">🛠️ 参与开发</a>
</p>

---

**OpenTiny NEXT-SDKs** 是一套前端智能应用开发工具包，旨在简化 WebAgent 的集成与使用，支持多种编程语言和前端框架，帮助开发者快速实现智能化功能。

## 📑 目录

- [✨ 主要特性](#-主要特性)
- [📦 核心包说明](#-核心包说明)
- [🚀 快速开始](#-快速开始)
- [🌐 浏览器直接引入](#-浏览器直接引入)
- [💡 核心概念](#-核心概念)
- [📖 使用场景](#-使用场景)
- [🛠️ 参与开发](#️-参与开发)
- [📚 相关资源](#-相关资源)
- [❓ 常见问题](#-常见问题)
- [📄 许可证](#-许可证)

## ✨ 主要特性

- 🚀 **多语言支持**：核心 SDK 支持 TypeScript、Python、Java 等多种编程语言
- 🎯 **简化集成**：提供简洁的 API 封装，简化与 WebAgent 服务的连接、认证等逻辑
- 🔌 **MCP 协议**：完整实现 Model Context Protocol（MCP）的 Web 版本，支持浏览器端工具调用
- 🤖 **AI 对话组件**：提供开箱即用的 AI 对话框组件（`@opentiny/next-remoter`）
- 🔄 **适配器层**：可将任意前端 AI 对话框组件快速接入 WebAgent 服务
- 🌐 **多模态支持**：支持文字、语音等多模态输入，抹平不同 LLM 之间的差异
- 📱 **二维码功能**：动态生成二维码，让企业应用的 MCP 服务快速接入 AI 对话框
- 🎪 **遥控器模式**：提供 PC 端和移动端遥控器，通过对话方式操控前端应用

## 📦 核心包说明

### @opentiny/next-sdk（当前包）

核心 SDK 包，提供：

- **WebMcpServer**：MCP 服务端实现，将前端功能声明为 MCP 工具
- **WebMcpClient**：MCP 客户端实现，连接 WebAgent 和其他 MCP 服务
- **WebAgent**：前端智能代理核心逻辑
- **McpSdk**：MCP SDK 封装
- **Transport 层**：支持多种通信方式（MessageChannel、SSE、HTTP 等）
- **工具函数和类型定义**：完整的 TypeScript 类型支持

### @opentiny/next-remoter

基于 `@opentiny/tiny-robot` 开发的 Vue3 AI 对话组件，提供：

- 完整的 AI 对话界面
- MCP 插件市场
- 扫码添加应用功能
- 多模型切换支持
- 生成式 UI 渲染

详见：[@opentiny/next-remoter 文档](../next-remoter/README.md)

## 🚀 快速开始

使用 OpenTiny NEXT-SDKs，只需要以下四步，就可以把你的前端应用变成智能应用。

### 第一步：安装依赖

```bash
npm install @opentiny/next-sdk
```

### 第二步：创建 MCP Server 并注册工具

```typescript
import { WebMcpServer, createMessageChannelPairTransport, z } from '@opentiny/next-sdk'

// 创建通信通道
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 创建 MCP Server
const server = new WebMcpServer({
  name: 'my-app-server',
  version: '1.0.0'
})

// 注册工具
server.registerTool('demo-tool', {
  title: '演示工具',
  description: '这是一个演示工具',
  inputSchema: { 
    foo: z.string().describe('输入参数') 
  },
}, async (params) => {
  console.log('接收到参数:', params)
  return { 
    content: [{ 
      type: 'text', 
      text: `已处理: ${params.foo}` 
    }] 
  }
})

// 连接 Server Transport
await server.connect(serverTransport)
```

### 第三步：创建 MCP Client 并连接 WebAgent

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

// 创建 MCP Client
const client = new WebMcpClient({
  name: 'my-app-client',
  version: '1.0.0'
})

// 连接 Client Transport
await client.connect(clientTransport)

// 连接到 WebAgent 服务
const { sessionId } = await client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})

console.log('获取到的 sessionId:', sessionId)
```

✅ 完成！现在你的前端应用已经变成智能应用，可以被 AI 操控了。

你可以通过各类 [MCP Host](https://modelcontextprotocol.io/clients) 来操控智能应用。

### 第四步：添加 AI 遥控器（可选）

我们提供了一个开箱即用的 AI 对话框组件，支持 PC 端和移动端，就像一个遥控器，可以通过对话方式操控你的前端应用。

#### 安装遥控器组件

```bash
npm install @opentiny/next-remoter
```

#### 在 Vue 项目中使用

```vue
<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

// 使用上一步获取的 sessionId
const sessionId = 'your-session-id'
</script>

<template>
  <tiny-remoter 
    :session-id="sessionId" 
    title="我的智能助手"
  />
</template>
```

#### 遥控器功能

遥控器会在你的应用右下角显示一个图标，悬浮后可以选择：

- 💬 **弹出 AI 对话框**：在应用侧边打开 AI 对话界面
- 📱 **显示二维码**：手机扫码后打开移动端遥控器

不管是 PC 端还是移动端，都可以通过自然语言对话的方式让 AI 帮你操作应用，极大提升工作效率！

## 🌐 浏览器直接引入

你也可以直接通过浏览器 HTML 标签导入 NEXT-SDKs，这样就可以使用全局变量 `WebMCP` 了。

```html
<html>
  <head>
    <!-- 导入 NEXT-SDKs -->
    <script src="https://unpkg.com/@opentiny/next-sdk@0.1/dist/index.umd.js"></script>
  </head>
  <body>
    <script>
      (async () => {
        const { WebMcpServer, createMessageChannelPairTransport, z, WebMcpClient } = WebMCP;
        const [serverTransport, clientTransport] = createMessageChannelPairTransport();

        const client = new WebMcpClient();
        await client.connect(clientTransport);
        const { sessionId } = await client.connect({
          agent: true,
          url: "https://agent.opentiny.design/api/v1/webmcp-trial/mcp",
        });

        const server = new WebMcpServer();
        server.registerTool(
          "demo-tool",
          {
            title: "演示工具",
            description: "一个简单工具",
            inputSchema: { foo: z.string() },
          },
          async (params) => {
            console.log("params:", params);
            return { content: [{ type: "text", text: `收到: ${params.foo}` }] };
          }
        );

        await server.connect(serverTransport);
      })();
    </script>
  </body>
</html>
```

## 💡 核心概念

### 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                       前端应用                                │
│  ┌──────────────────┐              ┌───────────────────┐   │
│  │  WebMcpServer    │◄────────────►│  WebMcpClient     │   │
│  │  (注册工具)       │  MessageChannel │  (连接 Agent)    │   │
│  └──────────────────┘              └───────────────────┘   │
│           ▲                                  │              │
└───────────┼──────────────────────────────────┼──────────────┘
            │                                  │
            │                                  ▼
            │                         ┌─────────────────┐
            │                         │   WebAgent 服务  │
            │                         │  (AI + MCP Hub) │
            │                         └─────────────────┘
            │                                  │
            │                                  ▼
            │                         ┌─────────────────┐
            └─────────────────────────┤  TinyRemoter    │
                                      │   (AI 遥控器)    │
                                      └─────────────────┘
```

**工作流程：**

1. **WebMcpServer** 在前端应用中注册可用的工具（如查询数据、操作 UI 等）
2. **WebMcpClient** 连接到 **WebAgent 服务**，获取 sessionId
3. **WebAgent** 作为中枢，连接 AI 大模型和各种 MCP 工具
4. **TinyRemoter** 提供用户界面，用户通过自然语言对话操控应用
5. AI 根据用户意图，调用相应的 MCP 工具完成任务

### WebMcpServer

WebMcpServer 是 MCP 服务端的实现，用于将前端应用的功能声明为 MCP 工具。

```typescript
import { WebMcpServer } from '@opentiny/next-sdk'

const server = new WebMcpServer({
  name: 'my-app',
  version: '1.0.0'
})

// 注册工具
server.registerTool('tool-name', {
  title: '工具标题',
  description: '工具描述',
  inputSchema: { /* Zod schema */ }
}, async (params) => {
  // 工具处理逻辑
  return { content: [{ type: 'text', text: '结果' }] }
})
```

### WebMcpClient

WebMcpClient 是 MCP 客户端的实现，用于连接 WebAgent 服务和其他 MCP 服务。

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient({
  name: 'my-client',
  version: '1.0.0'
})

// 连接到 WebAgent
const { sessionId } = await client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})
```

### Transport 通信层

NEXT-SDKs 支持多种通信方式：

- **MessageChannel**：浏览器内跨窗口通信
- **SSE**：Server-Sent Events 服务器推送
- **HTTP**：标准 HTTP 请求

```typescript
import { createMessageChannelPairTransport } from '@opentiny/next-sdk'

// 创建 MessageChannel 通信对
const [serverTransport, clientTransport] = createMessageChannelPairTransport()
```

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

### 项目结构

```
next-sdk/
├── packages/
│   ├── next-sdk/              # 核心 SDK 包
│   │   ├── agent/             # WebAgent 实现
│   │   ├── client/            # WebMCP 客户端
│   │   ├── server/            # WebMCP 服务端
│   │   ├── transport/         # 传输层实现
│   │   ├── McpSdk.ts          # MCP SDK 封装
│   │   ├── index.ts           # 主入口
│   │   ├── package.json
│   │   └── README.md
│   ├── next-remoter/          # Vue3 AI 对话组件
│   │   ├── src/
│   │   │   ├── components/    # 组件实现
│   │   │   └── composable/    # 组合式函数
│   │   ├── package.json
│   │   └── README.md
│   └── doc-ai/                # 文档示例应用
├── docs/                      # 项目文档
├── pnpm-workspace.yaml        # pnpm 工作区配置
├── package.json
└── README.md
```

### 开发流程

#### 1. 开发核心 SDK

```bash
# 进入 next-sdk 包目录
cd packages/next-sdk

# 开发模式（支持热重载）
pnpm dev

# 运行测试
pnpm test

# 构建项目
pnpm build
```

#### 2. 开发 Remoter 组件

```bash
# 进入 next-remoter 包目录
cd packages/next-remoter

# 启动开发服务器
pnpm dev

# 浏览器访问 http://localhost:5173
```

#### 3. 调试示例应用

```bash
# 进入 doc-ai 示例目录
cd packages/doc-ai

# 启动开发服务器
pnpm dev
```

### 构建脚本说明

核心 SDK 提供多种构建脚本：

```bash
# 构建所有版本（生产版 + 开发版）
pnpm build:all

# 仅构建生产版本
pnpm build:cdn

# 构建开发版本（包含 source map）
pnpm build:cdn:dev

# 构建特定模块
pnpm build:webAgent       # WebAgent 模块
pnpm build:webMcp         # WebMCP 模块
pnpm build:mcpSdk         # MCP SDK 模块
pnpm build:zod            # Zod 验证模块
pnpm build:webMcpFull     # WebMCP 完整版本
```

### 代码规范

在提交代码前，请确保代码符合以下规范：

- **TypeScript**：使用 TypeScript 编写类型安全的代码
- **代码风格**：遵循项目的 ESLint 配置
- **命名规范**：
  - 文件名：使用 kebab-case（如 `web-mcp-client.ts`）
  - 类名：使用 PascalCase（如 `WebMcpClient`）
  - 函数名：使用 camelCase（如 `registerTool`）
  - 常量：使用 UPPER_SNAKE_CASE（如 `MAX_RETRY_COUNT`）
- **注释**：为关键逻辑添加清晰的中文注释
- **测试**：为新功能添加单元测试

### 提交代码

#### 1. 创建分支

```bash
# 基于主分支创建功能分支
git checkout -b feature/your-feature-name

# 或者创建修复分支
git checkout -b fix/your-bug-fix
```

#### 2. 提交规范

我们使用约定式提交（Conventional Commits）规范：

```bash
# 新功能
git commit -m "feat: 添加 XXX 功能"

# Bug 修复
git commit -m "fix: 修复 XXX 问题"

# 文档更新
git commit -m "docs: 更新 XXX 文档"

# 代码重构
git commit -m "refactor: 重构 XXX 模块"

# 性能优化
git commit -m "perf: 优化 XXX 性能"

# 测试相关
git commit -m "test: 添加 XXX 测试"

# 构建相关
git commit -m "build: 更新构建配置"

# CI 相关
git commit -m "ci: 更新 CI 配置"
```

#### 3. 推送并创建 PR

```bash
# 推送到远程分支
git push origin feature/your-feature-name

# 在 GitHub 上创建 Pull Request
# 填写 PR 描述，说明改动内容和原因
```

### 发布流程

> 注意：发布需要项目维护者权限

```bash
# 1. 更新版本号
# 编辑 packages/next-sdk/package.json 中的 version 字段

# 2. 更新 CHANGELOG
# 记录本次发布的主要变更

# 3. 构建项目
pnpm build:all

# 4. 发布到 npm
cd packages/next-sdk
npm publish

# 或者发布 next-remoter
cd packages/next-remoter
npm publish
```

### 报告问题

如果你发现了 Bug 或有功能建议，请通过以下方式反馈：

1. 访问 [GitHub Issues](https://github.com/opentiny/next-sdk/issues)
2. 点击 "New Issue"
3. 选择合适的 Issue 模板
4. 填写详细的问题描述：
   - **Bug 报告**：包括复现步骤、预期行为、实际行为、环境信息等
   - **功能建议**：说明需求背景、期望功能、使用场景等

### 参与讨论

- 加入 [OpenTiny 社区](https://github.com/opentiny/next-sdk/discussions)
- 关注 [OpenTiny 官网](https://opentiny.design)
- 在 Issue 中参与技术讨论
- 帮助回答其他开发者的问题

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

### 示例项目

- [doc-ai](../doc-ai) - 文档 AI 助手示例
- [next-wxt](https://github.com/opentiny/next-sdk/tree/main/packages/next-wxt) - 浏览器扩展示例

### MCP 协议

- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)

### 外部链接

- [GitHub 仓库](https://github.com/opentiny/next-sdk)
- [NPM 包 - @opentiny/next-sdk](https://www.npmjs.com/package/@opentiny/next-sdk)
- [NPM 包 - @opentiny/next-remoter](https://www.npmjs.com/package/@opentiny/next-remoter)
- [问题反馈](https://github.com/opentiny/next-sdk/issues)
- [贡献指南](https://github.com/opentiny/next-sdk/blob/main/CONTRIBUTING.md)

## ❓ 常见问题

### 1. 如何获取 sessionId？

通过 WebMcpClient 连接 WebAgent 服务后自动获取：

```typescript
const { sessionId } = await client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})
```

### 2. 如何自定义 MCP 工具？

使用 `server.registerTool()` 注册自定义工具：

```typescript
server.registerTool('my-tool', {
  title: '我的工具',
  description: '工具描述',
  inputSchema: { 
    param1: z.string(),
    param2: z.number()
  }
}, async (params) => {
  // 实现工具逻辑
  return { content: [{ type: 'text', text: '执行结果' }] }
})
```

### 3. 支持哪些大语言模型？

NEXT-SDKs 支持所有兼容 AI SDK 的大语言模型，包括：

- OpenAI（GPT-4、GPT-3.5 等）
- DeepSeek
- Anthropic Claude
- 通义千问
- 文心一言
- 其他自定义模型

### 4. 如何处理跨域问题？

WebMCP 使用 MessageChannel 进行跨窗口通信，不受浏览器跨域限制。如果需要连接远程 MCP 服务，服务端需要正确配置 CORS。

### 5. 能否在 React 项目中使用？

可以！NEXT-SDKs 的核心功能与框架无关。虽然 `@opentiny/next-remoter` 是 Vue3 组件，但你可以：

- 直接使用核心 SDK（`@opentiny/next-sdk`）
- 基于核心 SDK 开发 React 版本的对话组件
- 使用浏览器直接引入方式

## 📄 许可证

[MIT](https://github.com/opentiny/next-sdk/blob/main/LICENSE)

Copyright (c) 2024-present OpenTiny Team

## 🙏 致谢

感谢所有为 OpenTiny NEXT-SDKs 项目做出贡献的开发者！

[![contributors](https://contrib.rocks/image?repo=opentiny/next-sdk)](https://github.com/opentiny/next-sdk/graphs/contributors)

---

如有任何问题或建议，欢迎提交 [Issue](https://github.com/opentiny/next-sdk/issues) 或 [Pull Request](https://github.com/opentiny/next-sdk/pulls)。
