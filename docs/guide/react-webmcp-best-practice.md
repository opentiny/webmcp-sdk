# React 工程接入 WebMCP + WebSkills 最佳实践

本文将以一个完整的**商品管理后台**为示例，带你一步步把普通 React 工程升级为 AI 驱动的智能应用。完成后，用户可以通过自然语言对话查询数据、触发业务操作，AI 还能自动跳转到对应页面并在页面内执行逻辑。

与 Vue 版本的核心差异在于：**TinyRemoter 是 Vue 的 AI 对话组件**， React 无法直接引用，需通过 **iframe + MessageChannel 跨窗口连接** 将主应用与 Remoter 打通。

> **示例工程仓库**：[`packages/doc-ai-react`](https://github.com/opentiny/next-sdk/tree/dev/packages/doc-ai-react)

## 核心概念

在开始之前，先理解各模块的职责及 React 的接入方式：

| 模块                 | 包名                            | 职责                                                       | React 中的位置                            |
| -------------------- | ------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| **WebMCP Server**    | `@opentiny/next-sdk`            | 在浏览器中运行的 MCP 工具服务器，注册可供 AI 调用的工具    | React 主窗口（如 `mcp-servers/index.ts`） |
| **Page Tool Bridge** | `@opentiny/next-sdk`            | 工具调用时自动导航到目标页面，并通过消息通信执行页面内逻辑 | 同主窗口，与 `registerPageTool` 配合      |
| **WebSkills**        | `@opentiny/next-sdk` + 技能文档 | 结构化知识包，让 AI 获得特定领域的角色和文档知识           | Remoter 侧（Vue iframe 内）               |
| **TinyRemoter**      | `@opentiny/next-remoter`        | Vue 实现的 AI 对话面板组件，集成 LLM + MCP + Skills        | **独立 Vue 应用，通过 iframe 嵌入**       |

### 为什么 React 需要 iframe + createMessageChannelClientTransport？

- **TinyRemoter 是 Vue 组件**，依赖 Vue 运行时，无法在 React 中直接使用。
- 采用 **双 HTML 入口** 方案：
  - **主窗口**：React 应用（`index.html`），负责路由、MCP Server、页面内 `registerPageTool`。
  - **子窗口**：独立 Vue 迷你应用（如 `remoter.html`），仅渲染 TinyRemoter UI，运行在 iframe 中。
- 两者通过 **MessageChannel** 跨窗口通信：
  - **主窗口**：`createMessageChannelServerTransport('local-mcp')` 创建服务端传输，监听 iframe 的连接。
  - **iframe 内**：`createMessageChannelClientTransport('local-mcp', window.parent)` 创建客户端传输，与主窗口的 MCP Server 建立连接。

这样，AI 对话 UI 在 iframe 里，MCP 工具与页面逻辑在主窗口，通过同一套 MCP 协议无缝协作。

### 为什么需要 Page Tool Bridge？

与 Vue 版一致：Web MCP 工具是**随页面生命周期开启和关闭**的。用户不一定打开了工具对应的页面，Page Tool Bridge 负责在需要时自动跳转并在页面内执行：

```text
AI 调用工具 → 检测目标页面是否已加载
    ↓ 未加载                ↓ 已加载
自动路由跳转          直接通过 postMessage 发送指令
    ↓
页面挂载，广播 page-ready
    ↓
发送工具调用消息 → 页面执行业务逻辑 → 返回结果
```

---

## 最终目录结构

完成本文所有步骤后，项目结构如下（以 `doc-ai-react` 为参考）：

```text
packages/doc-ai-react/
│── index.html                       # 主应用 HTML
├── src/
│   ├── main.tsx                         # React 入口
│   ├── App.tsx                           # 应用配置（含路由）
│   ├── mcp-servers/                     # ④ MCP 工具定义（主窗口，与 app 平级）
│   │   ├── index.ts                     # MCP Server + createMessageChannelServerTransport
│   │   ├── product-guide/tools.ts
│   │   └── price-protection/tools.ts
├── remoter/                             # 独立 Vue 子工程（iframe 内容）
│   ├── package.json
│   ├── vite.config.ts                   # base: '/remoter/'
│   ├── index.html                       # Remoter 入口
│   └── src/
│       ├── main.ts                      # Vue 挂载到 #remoter-app
│       ├── App.vue                      # ⑦ TinyRemoter + createMessageChannelClientTransport
│       └── skills/                      # ⑧ WebSkills（保留在 Vue 侧）
│           └── product-guide/
│               ├── SKILL.md
│               └── reference/
│                   └── product-listing.md
├── vite.config.ts                         # 配置主应用的proxy代理
└── package.json                         # dev 脚本同时启动主应用 与 remoter
```

---

## 安装依赖

**主应用（React）：**

```bash
pnpm add @opentiny/next-sdk
```

**Remoter 子包（Vue，iframe 内）：**

在 `remoter/package.json` 中依赖：

```json
{
  "dependencies": {
    "@opentiny/next-sdk": "0.2.6-beta.0",
    "@opentiny/next-remoter": "workspace:*"
  }
}
```

若为独立仓库，可使用 npm 版本：`@opentiny/next-remoter` 从 npm 安装，版本与 next-sdk 兼容即可。

---

## 第一步：配置路由并在根组件注册 setNavigator

与 Vue 版类似，`setNavigator` 告诉 SDK 如何跳转页面。在 React 中,需要在App.tsx中，局部创建一个`RouterManager`组件来监听路由切换。

```ts
// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { setNavigator } from '@opentiny/next-sdk'
import HomePage from './components/HomePage'
import ComprehensivePage from './components/ComprehensivePage'
import PriceProtectionPage from './components/PriceProtectionPage'
import { createMcpServer } from './mcp-servers'
import './App.css'

// 路由管理器组件 - 在 Router 上下文中设置导航器
function RouterManager() {
  const navigate = useNavigate()

  useEffect(() => {
    // 设置导航器
    setNavigator(async (route) => {
      await navigate(route)
    })
    // 启动 MCP Server（创建 MessageChannel 服务端并等待 iframe 连接）
    createMcpServer()
  }, [])

  return null
}

function App() {
  return (
    <BrowserRouter>
      {/* 路由管理器 - 设置全局导航器 */}
      <RouterManager />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/comprehensive" element={<ComprehensivePage />} />
        <Route path="/price-protection" element={<PriceProtectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
```

> **注意**：`setNavigator` 只需在应用入口（根组件）调用一次，全局生效。该导航函数会被 SDK 用于：① withPageTools 在调用页面工具时自动跳转；② 内置的 `navigate_to_page` 工具（通过 `registerNavigateTool` 注册）在大模型主动请求跳转时使用, 无需再单独注入 React 专属的导航器。

---

## 第二步：主窗口布局中嵌入 iframe（Remoter）

主应用布局中预留一块区域，用 **iframe** 加载 Remoter 的入口页面。Remoter 以独立开发服务运行（如 Vite 端口 5179），为防止跨域，通过代理将 `/remoter` 转发到该服务。

```html
<!-- index.html -->
<!-- 左右分栏：左侧 70% 主内容，右侧 30% AI 助手 -->
<div class="app-container">
  <div class="main-content">
    <div id="root"></div>
  </div>
  <aside class="remoter-sidebar">
    <iframe
      id="remoterFrame"
      class="remoter-frame"
      src="/remoter/"
      frameborder="0"
      allow="clipboard-write"
      title="AI 助手"
    ></iframe>
  </aside>
</div>
```

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/remoter': {
        target: 'http://localhost:5179',
        changeOrigin: true
      }
    }
  }
})
```

---

## 第三步：主窗口创建 MCP Server 并监听 iframe（MessageChannel 服务端）

在 React 主窗口中创建 WebMCP Server，使用 **createMessageChannelServerTransport** 建立**跨窗口**服务端传输层，供 iframe 内的 TinyRemoter 连接。与 Vue 版不同，这里**不再使用** `createMessageChannelPairTransport()`（同窗口内存对），而是：

- **主窗口**：`createMessageChannelServerTransport('local-mcp')` + `listen()`，等待 iframe 连接。
- **iframe**：使用 `createMessageChannelClientTransport('local-mcp', window.parent)` 连接主窗口（下一步）。

`endpoint` 字符串（如 `'local-mcp'`）两端必须一致。

```ts
// src/mcp-servers/index.ts
import {
  WebMcpServer,
  createMessageChannelServerTransport,
  withPageTools,
  registerNavigateTool
} from '@opentiny/next-sdk'
import registerProductGuideTools from './product-guide/tools'
import registerPriceProtectionTools from './price-protection/tools'

const rawServer = new WebMcpServer()

/**
 * 用 withPageTools 包装 server，使 registerTool 支持路由配置对象。
 * MCP Server 与 registerPageTool 均在 react 主窗口，page-tool-bridge 同窗口 postMessage 即可。
 */
export const server = withPageTools(rawServer)

/**
 * 初始化 MCP Server：创建 MessageChannel 服务端传输层，
 * 监听 iframe（remoter.html）中 TinyRemoter 的 MCP 连接。
 * 对应 iframe 侧：createMessageChannelClientTransport('local-mcp', window.parent)
 */
export const createMcpServer = async () => {
  registerNavigateTool(rawServer)
  registerProductGuideTools(server)
  registerPriceProtectionTools(server)
  const serverTransport = createMessageChannelServerTransport('local-mcp')
  await serverTransport.listen()
  await rawServer.connect(serverTransport)
}
```

> **页面跳转工具（navigate_to_page）**：与 Vue 版相同，使用 SDK 提供的 `registerNavigateTool(rawServer)` 即可。工具运行在**主窗口**，会调用你通过 `setNavigator` 注册的导航函数，并等待目标页面广播 page-ready 后再返回，因此 Remoter 在 iframe 内时，路由状态与工具列表的同步不受影响，无需在主窗口再手写一套跳转或 setReactNavigator。

工具定义（`product-guide/tools.ts`、`price-protection/tools.ts`）与 Vue 版一致：`server.registerTool(name, schema, { route: '/path', timeout?: number, invokeEffect?: boolean | ToolInvokeEffectConfig })`。

- `route`：必选，目标路由路径；
- `timeout`：可选，等待页面响应的超时时间（ms），默认 30000；
- `invokeEffect`：可选，是否在调用该页面工具时在**主窗口左下角**展示调用提示效果，类型为 `boolean | { label?: string }`。

示例（以订单查询为例）：

```ts
server.registerTool(
  'order_query',
  {
    title: '查询订单',
    description: '【订单管理工具】查询电商订单列表，可按订单号、客户姓名或状态筛选。'
  },
  {
    route: '/orders',
    invokeEffect: {
      label: '正在为你查询订单列表…'
    }
  }
)
```

> 说明：
>
> - `invokeEffect: true` 使用默认文案（`config.title || toolName`）；
> - 传对象时可自定义 `label`，如「正在为你整理订单数据…」；
> - 调用开始时展示提示卡片，结束后自动淡出；Remoter 在 iframe 中时同样生效，因为效果直接渲染在 React 主窗口。

---

## 第四步：iframe 内 Vue 应用使用 createMessageChannelClientTransport 连接主窗口

Remoter 是独立 Vue 应用，入口为 `remoter/index.html`，挂载 `remoter/src/App.vue`。在 App.vue 中：

1. 使用 **createMessageChannelClientTransport('local-mcp', window.parent)** 创建客户端传输，与主窗口的 MCP Server 配对。
2. 将得到的 `clientTransport` 作为 `mcpServers[name].transport` 传给 TinyRemoter。
3. Skills 仍在 Vue 侧通过 `import.meta.glob('./skills/**/*', { query: '?raw', import: 'default', eager: true })` 加载。

```vue
<!-- remoter/src/App.vue -->
<template>
  <tiny-remoter
    :skills="skillMdModules"
    :show="show"
    :fullscreen="true"
    :menuItems="menuItems"
    :mcpServers="mcpServers"
  />
  <!--
    可选：工具较多且各页面工具职责独立时，可添加 :pageToolsOnDemand="true"，
    仅展示当前路由对应的工具，详见 TinyRemoter 文档。
  -->
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import { createMessageChannelClientTransport } from '@opentiny/next-sdk'
import type { MenuItemConfig } from '@opentiny/next-sdk'
import { ref } from 'vue'

const menuItems = ref<MenuItemConfig[]>([])
const show = ref(true)

/** 加载 skills 目录下所有 markdown（技能定义） */
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

/** MessageChannel 客户端：与 React 主窗口中的 MCP Server 通信（通过 window.parent） */
const clientTransport = createMessageChannelClientTransport('local-mcp', window.parent)

const mcpServers = {
  'local-mcp-server': {
    type: 'local',
    transport: clientTransport
  }
}
</script>
```

要点：

- **endpoint** 与主窗口 `createMessageChannelServerTransport('local-mcp')` 一致。
- **globalObject** 传 `window.parent`，保证与主窗口通信；若 Remoter 与主应用同源，即可正常使用。

---

## 第五步：在 React 页面内注册工具处理器（registerPageTool）

与 Vue 版一致，在**目标页面对应的 React 组件**中，在 `useEffect` 里调用 `registerPageTool`，在 `cleanup` 中注销。handlers 的 key 与 `mcp-servers` 中注册的工具名一致。

### 5.1 单工具示例（商品指南）

```ts
// src/components/ComprehensivePage.tsx（节选）
import { useState, useEffect } from 'react'
import { registerPageTool } from '@opentiny/next-sdk'
export default function ComprehensivePage() {
  // 在页面加载生命周期注册页面工具，在页面卸载时，清除注册
  useEffect(() => {
    const cleanupPageTool = registerPageTool({
      handlers: {
        'product-guide': async ({ productId }: { productId: string }) => {
          const product = products.find((p) => String(p.id) === productId)
          const text = product
            ? `产品信息：${JSON.stringify(product, null, 2)}`
            : `未找到产品 ID 为 ${productId} 的商品`
          return { content: [{ type: 'text', text }] }
        }
      }
    })

    return () => {
      cleanupPageTool()
    }
  }, [])
}
```

`route` 省略时，SDK 使用 `window.location.pathname`（即当前 React 路由路径）。若路径与工具注册时的 `route` 不一致（如 hash 路由、子路径前缀），需在 `registerPageTool` 中显式传 `route`。

### 5.2 多工具同一路由（价保管理）

```ts
// src/components/PriceProtectionPage.ts（节选）
// registerPageTool 的 options 类型为 { route?: string; handlers: Record<string, (input) => Promise<...>> }
const cleanupPageTool = registerPageTool({
  route: '/price-protection',
  handlers: {
    'price-protection-query': async ({ status }: { status?: string }) => {
      /* ... */
    },
    'price-protection-review': async ({
      id,
      action,
      remark
    }: {
      id: string | number
      action: 'approve' | 'reject'
      remark?: string
    }) => {
      /* ... */
    },
    'price-protection-detail': async ({ id }: { id: string | number }) => {
      /* ... */
    }
  }
})
```

> **处理器编写规范**（与 Vue 版相同）：
>
> - handler 参数类型由工具的 `inputSchema` 决定。
> - 返回值格式：`{ content: Array<{ type: 'text', text: string }> }`。
> - 组件销毁时必须调用 cleanup，避免内存泄漏和消息串扰。

---

## 第六步：Remoter 子工程与代理配置

### 6.1 Remoter 为独立 Vue 工程

- 使用 Vite 单独启动（如端口 5179），`base: '/remoter/'`，以便主应用通过路径前缀代理。
- 入口：`remoter/index.html` → `remoter/src/main.ts` → 挂载 `App.vue`。

### 6.2 主应用代理（React）

开发时主应用需把 Remoter 的 HTML 和静态资源代理到 Vite 开发服务：

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/remoter': {
        target: 'http://localhost:5179',
        changeOrigin: true
      }
    }
  }
})
```

### 6.3 同时启动主应用与 Remoter

```bash
# 同时启动 React 主应用 与 Remoter（concurrently）
pnpm dev
# 或
pnpm run dev
```

`package.json` 示例：

```json
{
  "scripts": {
    "dev": "concurrently -n react,remoter \"vite\" \"pnpm -C remoter dev\"",
    "dev:react": "vite",
    "dev:remoter": "pnpm -C remoter dev"
  }
}
```

访问主应用地址（如 <http://localhost:5173>），页面中的 iframe 会加载 `/remoter`，经代理得到 Remoter 页面；Remoter 内通过 `createMessageChannelClientTransport('local-mcp', window.parent)` 与主窗口 MCP Server 建立连接。

---

## 第七步：配置 WebSkills（可选，在 Remoter 侧）

Skills 让 AI 获得领域知识与角色设定。因 TinyRemoter 运行在 Vue iframe 内，**技能目录放在 Remoter 工程**（如 `remoter/src/skills/`），在 App.vue 中已通过 `import.meta.glob('./skills/**/*', ...)` 注入 `tiny-remoter`。

目录与编写方式与 Vue 版一致，例如：

```text
remoter/src/skills/product-guide/
├── SKILL.md
└── reference/
    └── product-listing.md
```

SKILL.md 的 YAML Front Matter 中 `description` 要写清使用场景，便于 AI 匹配。

---

## 完整数据流说明（含 iframe 与 MessageChannel）

以用户对话「帮我查一下产品 ID 为 123 的信息」为例，突出 **Remoter 在 iframe、主窗口 MCP + 页面逻辑** 的协作：

```text
用户在主页面与 iframe 内的 TinyRemoter 对话
    ↓
TinyRemoter（iframe）将消息发给 LLM
    ↓
LLM 决定调用 product-guide 工具，参数 { productId: "123" }
    ↓
TinyRemoter 的 MCP Client 通过 createMessageChannelClientTransport
    向 window.parent（主窗口）发送工具调用
    ↓
主窗口的 MCP Server（createMessageChannelServerTransport）收到请求，
    withPageTools 发现工具绑定路由 /comprehensive
    ↓
检查 /Comprehensive 是否已激活？
    ↓ 未激活                     ↓ 已激活
setNavigator 跳转到 /Comprehensive  直接通过 postMessage 在主窗口内发送
React 路由切换，页面挂载          工具调用消息
    ↓
页面组件 加载时 执行 registerPageTool，广播 page-ready
    ↓
SDK 收到 page-ready，在主窗口内 postMessage 发送
    { toolName: 'product-guide', input: { productId: '123' } }
    ↓
页面内 handler 执行，返回 { content: [{ type: 'text', text: '...' }] }
    ↓
结果经 MessageChannel 回传到 iframe 的 MCP Client → LLM → TinyRemoter
    ↓
用户看到 AI 的最终回复
```

---

## 与 Vue 版本的对照

| 项目                  | Vue 版本                                                  | React 版本                                                                                                                                   |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| TinyRemoter 使用方式  | 直接在主应用内引用 Vue 组件                               | **iframe 嵌入独立 Vue 应用**，主应用不直接引用 Remoter                                                                                       |
| MCP 连接方式          | `createMessageChannelPairTransport()` 同窗口内存对        | **主窗口** `createMessageChannelServerTransport('local-mcp')` + **iframe** `createMessageChannelClientTransport('local-mcp', window.parent)` |
| setNavigator          | 在 `App.tsx` 中 `setNavigator()`                          | 在根组件中 `setNavigator()`                                                                                                                  |
| MCP Server 与工具注册 | 在 App.vue 或独立模块，同窗口                             | 在 `mcp-servers/index.ts`，**主窗口**                                                                                                        |
| 页面工具注册          | `onMounted` + `registerPageTool`，`onUnmounted` + cleanup | `加载时 registerPageTool`，`卸载时cleanup`                                                                                                   |
| WebSkills 位置        | 主应用 `src/skills/`                                      | **Remoter 工程** `remoter/src/skills/`（Vue 侧）                                                                                             |
| 开发与代理            | 单应用，无需代理                                          | **双入口**：主应用 + Remoter 子包，主应用代理 `/remoter`、`/remoter` 到 Remoter 开发服务                                                     |

---

## 常见问题

### 工具调用超时？

- 确认 **Remoter iframe 已加载**，且主窗口已执行 `createMcpServer()`（含 `serverTransport.listen()`）。
- **endpoint 一致**：主窗口 `createMessageChannelServerTransport('local-mcp')` 与 iframe 内 `createMessageChannelClientTransport('local-mcp', window.parent)` 的 `'local-mcp'` 必须相同。
- 页面是否调用了 `registerPageTool`，且 handlers 的 key 与 `server.registerTool` 的工具名一致。
- 若使用 hash 或特殊 base 路径，`registerPageTool` 需显式传 `route`，与工具定义的 `route` 一致。

### iframe 空白或无法加载 Remoter？

- 开发时是否**同时启动了** React 主应用 和 Remoter（`pnpm dev`）。
- Remoter 的 `vite.config.ts` 中 `base: '/remoter/'` 与代理路径重写是否匹配。

### 工具名大小写

`server.registerTool('product-guide', ...)` 与 `registerPageTool({ handlers: { 'product-guide': ... } })` 中的工具名必须**完全一致**（大小写敏感）。

### 多个工具共用一个路由

与 Vue 版相同：多个 `server.registerTool(..., { route: '/same-path' })`，同一页面的 `registerPageTool` 的 handlers 中列出所有工具名即可。

### 如何让 AI 先跳转再使用页面工具？

与 Vue 版相同：在 `createMcpServer` 中调用 `registerNavigateTool(rawServer)` 即可注册内置的 `navigate_to_page` 工具。工具运行在主窗口，会使用 `setNavigator` 执行跳转并等待 page-ready，Remoter 在 iframe 内时也会通过既有桥接协议收到路由状态更新，无需主窗口再手写 setReactNavigator 或等待逻辑。

### 如何在不跳转的情况下使用工具？

若工具不依赖页面状态，在 `mcp-servers` 中直接传回调函数作为第三个参数，例如：

```ts
server.registerTool('get-time', { title: '获取当前时间', description: '...' }, async () => {
  return { content: [{ type: 'text', text: new Date().toLocaleString() }] }
})
```

---

## 参考

- 完整示例工程：**packages/doc-ai-react**（含主应用、remoter 子包、代理与双入口启动）。
- Vue 同架构最佳实践：**docs/guide/vue-webmcp-best-practice.md**。
- Remoter 为 Vue 组件，React 侧仅通过 **iframe + createMessageChannelClientTransport** 与其通信，MCP 与 Page Tool Bridge 逻辑均在 React 主窗口完成。
