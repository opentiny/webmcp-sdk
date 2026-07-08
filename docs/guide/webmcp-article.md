# WebMCP 深度指南：从浏览器原生 API 到 OpenTiny next-sdk 实践

![WebMCP 开启 AI 原生导航新时代](../assets/images/guide/hero-banner.png)

在 Web AI 技术飞速发展的今天，如何让 AI Agent 有效地感知并操作网页端业务逻辑，已成为提升交互体验的关键。传统的 Web 自动化往往依赖于解析 DOM、无障碍树或通过视觉模型(VLM)模拟人类点击，这些方式不仅性能开销大，且极易因为 UI 变动而失效。

随着 **WebMCP (Model Context Protocol for Web)** 提案的出现，这一难题迎来了革命性的标准解法。WebMCP 允许开发者直接在浏览器网页端（Client-side）通过标准化接口暴露业务逻辑，让浏览器内置的 AI Agent（或插件）能够以“工具调用(Tool Calling)”的方式直接操纵网页功能。

本文将作为 WebMCP 的**中文使用指南**，详细介绍其原生 API 的用法，并深入讲解如何通过 **OpenTiny next-sdk** 与 **remoter 组件** 将其平滑落地到现有的前端工程中。

---

## 一、什么是 WebMCP？为什么要使用它？

WebMCP 的核心目标是将网页应用的功能（如 JavaScript 函数）转化为带有自然语言描述和结构化 Schema 的“工具 (Tools)”，供 AI 代理使用。

### 相比于传统后端集成的优势

在 WebMCP 出现之前，大部分 AI 插件是通过“后端集成（Backend Integrations）”调用外部 API（例如直接通过云端大模型请求业务服务器）。这种模式存在明显缺陷：

1. **上下文断层与 UI 脱节**：AI 的操作在后台完成，网页 UI 无法及时给出视觉反馈，用户失去了对执行过程的可见性。
2. **状态与鉴权重复**：需要开发者在服务器端重新复制用户的状态和认证信息。
3. **开发成本高**：需要专门编写后端服务器接口，无法复用已有的客户端 JavaScript 逻辑。

**WebMCP 的解决方案**是在**浏览器端（In-browser）**提供一套类似 MCP 的机制。开发者复用现有的客户端代码定义工具，AI 代理通过浏览器直接调用这些工具，不仅共享了当前的登录态和页面上下文，工具的执行结果也会立刻反映在当前页面的 UI 上，真正实现了**“人机协同 (Human-in-the-loop)”**。

---

## 二、浏览器原生 WebMCP API 详解

Chrome 正在原生实现这套标准（目前处于实验阶段）。核心接口均挂载在 `document.modelContext` 对象上。下面我们将通过一个完整的计数器示例，详细介绍各种 API 的用法。

### 1. 注册工具 (`registerTool`)

工具的注册支持从极简到复杂的多种模式，开发者可以配置面向人类的显示名称 `title`，也可以通过 `inputSchema` 定义严格的参数校验。

#### 极简模式与显示名称 (title)

除了 `name` 之外，规范还支持 `title` 字段。它是一个面向人类用户的工具显示名称，适合用于 UI 展示（例如大模型的插件列表），并且可以配合前端框架进行多语言本地化翻译。

如果工具不需要参数，可以直接返回执行结果。

```typescript
document.modelContext.registerTool({
  name: 'getCounter',
  title: '获取计数器', // 面向用户的友好显示名称
  description: '查询当前计数器的值',
  execute: () => {
    // 直接返回字符串，底层会自动封装为 MCP content
    return `当前计数器的值为: ${counter}`
  }
})
```

#### 标准参数输入与异步执行

使用 JSON Schema (`inputSchema`) 严格定义输入参数。`execute` 函数支持 `async`。

```typescript
document.modelContext.registerTool({
  name: 'addCounter',
  title: '加法计数器',
  description: '设置计数器的值为当前值 + 输入的值',
  inputSchema: {
    type: 'object',
    properties: {
      value: {
        type: 'number',
        description: '待增加的值，必须是整数'
      }
    },
    required: ['value']
  },
  execute: async (input: { value: number }) => {
    setCounter(counter + input.value)
    return `计数器的值已设置为: ${counter}`
  }
})
```

#### 工具注解 (`annotations`)

可以通过 `annotations` 提示 AI 该工具的安全性属性：

- `readOnlyHint`: 标记该工具是否仅读取数据而不修改任何状态。
- `untrustedContentHint`: 标记工具返回的数据是否可能包含不受信任的内容（防范提示词注入）。

```typescript
document.modelContext.registerTool({
  name: 'powerCounter',
  description: '设置计数器的值为当前值的平方',
  inputSchema: { type: 'object', properties: {} },
  execute: async () => {
    /* ... */
  },
  annotations: {
    readOnlyHint: false,
    untrustedContentHint: false
  }
})
```

### 2. 动态注销工具 (`AbortSignal`)

对于 SPA（单页应用），当组件销毁或路由切换时，我们需要注销不再可用的工具。WebMCP 巧妙地利用了现代浏览器的 `AbortController` 机制：

```typescript
const controller = new AbortController()

document.modelContext.registerTool(
  {
    name: 'temporaryTool',
    description: '这是一个随时可能被注销的工具'
    /* ... */
  },
  { signal: controller.signal } // 传入信号
)

// 当需要注销工具时（例如在组件 onUnmounted 生命周期中）：
controller.abort()
```

### 3. 跨域与 iframe 暴露控制 (`exposedTo`)

在 `registerTool` 的第二个可选参数 `options` 中，除了 `signal` 之外，还可以使用 `exposedTo` 属性。该属性接收一个 Origins（来源）数组，允许开发者精确控制这个工具可以被当前文档树中哪些来源的 `iframe` 代理或文档访问，这对复杂页面嵌套的安全性非常有帮助：

```typescript
document.modelContext.registerTool(
  {
    name: 'secureTool',
    title: '受限工具',
    description: '一个受限访问的工具',
    execute: async () => { /* ... */ }
  },
  { 
    // 仅允许指定的源访问该工具
    exposedTo: ['https://trusted-agent.example.com']
  }
)
```

### 4. 请求用户授权确认 (`requestUserInteraction`)

对于涉及支付、删除等高危操作，不应由 AI 直接静默执行。WebMCP 提供 `clientContext` 让开发者能够在执行关键步骤前，挂起流程并请求用户在 UI 上进行确认。

```typescript
document.modelContext.registerTool({
  name: 'clearCounter',
  description: '清空计数器（执行前会询问用户）',
  inputSchema: { type: 'object', properties: {} },
  // execute 第二个参数注入了 clientContext
  execute: async (args, clientContext) => {
    // 挂起 AI 执行流程，弹出浏览器或自定义的确认框
    const confirm = await clientContext.requestUserInteraction(async () => {
      return window.confirm('确定要清空计数器吗？') ? '执行' : '取消'
    })

    if (confirm === '执行') {
      setCounter(0)
      return `计数器的值已清空`
    } else {
      return '用户取消了执行'
    }
  }
})
```

### 5. 客户端工具发现与调用

AI 代理或前端对话 UI 可以通过以下 API 发现并主动调用已注册的工具。

```typescript
// 1. 获取当前页面所有注册的工具列表
const toolsList = await document.modelContext.getTools()
console.log('当前可用工具:', toolsList)

// 2. 执行工具
// 注意：必须传入【工具对象引用】以及【JSON.stringify 序列化后的参数字符串】
const toolResult = await document.modelContext.executeTool(toolsList[0], JSON.stringify({ value: 9 }))

// 3. 监听工具列表变化
// 任何通过 registerTool 增加或 abort 移除工具的操作，都会触发该事件
document.modelContext.addEventListener('toolchange', async () => {
  const newToolsList = await document.modelContext.getTools()
  console.log('工具列表已更新', newToolsList)
})
```

---

## 三、生产环境落地：OpenTiny next-sdk 实践

原生 WebMCP 标准描绘了美好的愿景，但它目前在浏览器覆盖度以及中大型前端项目（如 Vue/React 单页应用）的复杂状态管理中仍有不少挑战。**OpenTiny next-sdk** 提供了一整套企业级解决方案。

### 1. 引入 Polyfill 抹平兼容性

由于绝大部分用户的浏览器尚未内置 WebMCP，我们需要引入 polyfill 以保证代码的健壮性。

```typescript
import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'

// 在应用入口极简接入
// 该方法会在不支持原生规范的浏览器上注入标准的 document.modelContext API
initializeWebMCPPolyfill()
```

_注：`@opentiny/next-sdk` 内部封装了平滑接入 WebMCP 的初始化与兼容层机制，开发者可以直接使用相应的 API。_

### 2. 完美对接 next-remoter 智能对话 UI

业务工具注册完毕后，如何向用户展示 AI 交互界面并让模型能够调用这些内置工具？**OpenTiny next-sdk** 配合 **next-remoter** 组件完美衔接了这最后一步。

在项目中，你无需手动处理复杂的协议通信，只需通过配置 `mcpServers` 属性，即可将浏览器原生的 WebMCP 接入到对话组件中：

```vue
<template>
  <!-- 在应用的页面中引入对话组件，传入 mcpServers 配置 -->
  <tiny-remoter :mcpServers="mcpServers"></tiny-remoter>
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import type { McpServerConfig } from '@opentiny/next-sdk'

// 2. 将 document.modelContext 包装为内置 MCP Server
// 【核心步骤】这一步打通了云端大模型与浏览器本地工具的通信链路
const mcpServers: Record<string, McpServerConfig> = {
  'mcp-server-builtin-webmcp': {
    type: 'builtin' as const,
    client: document.modelContext,
    name: '浏览器内置工具',
    description: '通过 document.modelContext 暴露的浏览器原生 MCP 工具'
  }
}
</script>
```

**为什么这种接入方式如此高效？因为底层的复杂交互已被完全封装：**

1. **工具动态发现**：`remoter` 内部会监听 `document.modelContext` 的 `toolchange` 事件，自动感知当前页面注册或销毁的工具，并实时将最新的 Schema 同步给大模型。
2. **自动代理执行**：当大模型决定调用特定工具时，底层会自动拦截指令，并代为调用浏览器的原生 `document.modelContext.executeTool()` 执行，最后将页面 UI 执行的结果反馈给模型和用户。

通过这一套组合拳，开发者**完全无需在应用层手动编写繁琐的消息透传与代理机制**，只需专注写好页面的 `registerTool` 业务逻辑，AI 助手就能无缝理解并操纵当前网页。

---

## 结语

WebMCP 并非要替代传统的后端服务器生态，而是将原本只开放给“人类键鼠交互”的浏览器前端功能，以结构化契约的形式开放给了 AI 代理。

通过结合 **WebMCP 原生标准** 与 **OpenTiny next-sdk**（含 polyfill、remoter 组件集成），开发者可以在几乎不改变现有前端业务架构的前提下，快速低成本地为 Web 应用插上“原生 AI 操作”的翅膀，迈向人机高效协作的新纪元。

---

💡 **参考资料与示例工程**

- [WebMCP 标准提案规范 (GitHub)](https://github.com/webmachinelearning/webmcp)
- [OpenTiny NEXT-SDKs 官方仓库](https://github.com/opentiny/webmcp-sdk)
