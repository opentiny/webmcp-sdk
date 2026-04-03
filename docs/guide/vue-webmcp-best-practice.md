# Vue 工程接入 WebMCP + WebSkills 最佳实践

本文根据最新的 WebMCP 标准与 `doc-ai` 示例项目，带你一步步把普通 Vue 工程升级为 AI 驱动的智能应用。

> **核心变化**：我们现在**统一使用浏览器原生的 `navigator.modelContext` 接口**。通过调用 SDK 提供的初始化函数，低版本浏览器也能获得完全一致的 Polyfill 支持，实现 AI 工具的自动注册与路由同步。

> **示例工程仓库**：[`packages/doc-ai`](https://github.com/opentiny/next-sdk/tree/dev/packages/doc-ai)

---

## 核心概念

在 Web 端集成 MCP 时，最重要的资产是 **“模型上下文 (Model Context)”**。

1.  **标准 API**：使用浏览器标准的 `navigator.modelContext` 进行工具管理。
2.  **全平台 Polyfill**：调用 `initializeBuiltinWebMCP` 后，SDK 会确保 `navigator.modelContext` 在所有浏览器中均可用。
3.  **自动路由感知**：当 AI 在对话中判定需要调用某个页面的工具时，SDK 会自动驱动路由跳转，确保工具在调用前已就绪。

| 模块                 | 职责                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| **Model Context**    | 浏览器原生接口，用于注册工具。对话组件（如 TinyRemoter）会自动从中读取。 |
| **Page Tool Bridge** | 监听 AI 指令，负责路由跳转 (Navigator) 与工具调用之间的时序同步。        |
| **WebSkills**        | 让 AI 获得业务知识（如产品手册、SOP）的 Markdown 文档包。                |
| **WebAgent**         | 远程代理模块，支持手机或异地 AI 通过识别码控制当前页面工具。             |

---

## 推荐目录结构

为了保持项目的可维护性，建议采用下方的模块化结构（参考 `doc-ai` 项目）：

```text
src/
├── main.ts              # 激活 Builtin WebMCP + 设置 Navigator
├── App.vue              # 放置 TinyRemoter + 批量加载 Skills + 初始化 WebAgent
├── mcp-servers/         # 【方案B】分离式配置目录 (简单应用)
│   ├── finance/
│   │   └── tools.ts     # 定义工具 Schema 与 routeConfig
│   └── useWebAgentServer.ts # 远程遥控初始化逻辑
├── skills/              # 【方案A】WebSkills 知识库 (大型应用)
│   ├── inventory/
│   │   └── SKILL.md     # 库存业务引导词
│   └── sales/
│       └── SKILL.md
└── views/               # 业务页面
    ├── inventory/
    │   └── index.vue    # 【方案A】页面内按需注册 (onMounted)
    └── finance/
        └── index.vue    # 【方案B】逻辑绑定 (registerPageTool)
```

---

## 第一步：环境初始化 (main.ts)

在应用入口处，你需要激活内置服务器并配置导航器。

```ts
// src/main.ts
import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import { setNavigator, initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

// 1. 注册核心导航器：告诉 SDK 如何跳转页面
setNavigator(async (route) => {
  const failure = await router.push(route)
  if (failure) {
    // 处理重复跳转：如果已经在目标页面，直接返回 true 告知 SDK
    if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
      return true
    }
    throw new Error(`页面跳转失败: ${(failure as any).message}`)
  }
})

// 2. 激活浏览器内置 WebMCP 服务 (含低版本浏览器 Polyfill)
initializeBuiltinWebMCP()

const app = createApp(App)
app.use(router)
app.mount('#app')
```

---

## 第二步：在页面组件中定义工具 (中大型应用首选)

对于复杂的业务系统，我们**强烈建议**在页面组件内部按需注册工具。

### 为什么这是最佳实践？

1.  **减少幻觉**：工具只在对应的业务页面挂载时存在，大模型不会在无关页面看到干扰工具。
2.  **降低负载**：工具列表随路由变化自动增减，保证上下文（Context）的高效。
3.  **配合 Skills**：通过 WebSkills 引导 AI 意图。当 AI 判定用户需要执行库存操作时，它会由 Skills 指导先跳转到 `/inventory`，随后在该页面内自动激活对应的工具。

```vue
<!-- src/views/product-list/index.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const modelContext = (navigator as any).modelContext

onMounted(() => {
  if (!modelContext) return

  modelContext.registerTool({
    name: 'get_product_detail',
    description: '查询商品详情。',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '商品 ID' }
      },
      required: ['id']
    },
    execute: async ({ id }: { id: string }) => {
      return { content: [{ type: 'text', text: `商品 ${id} 的状态：销售中` }] }
    }
  })
})

onUnmounted(() => {
  modelContext?.unregisterTool('get_product_detail')
})
</script>
```

---

## 进阶：分离式全量注册 (适合轻量/小型应用)

如果你的应用功能较少，或者不想编写繁琐的 WebSkills，可以使用**一次性全量注册**方案。

### 1. 声明式配置 (含 routeConfig)

在独立文件中定义工具及其所属路由。这种方式下，AI 随时可见该工具，并能自动触发跳转。

```ts
// src/mcp-servers/finance/tools.ts
export default function registerFinanceTools() {
  ;(navigator as any).modelContext.registerTool({
    name: 'finance_summary_query',
    title: '查询财务数据',
    description: '查询关键财务指标。',
    inputSchema: {
      /* ... */
    },
    // 💡 关键：无需 Skills，显式声明跳转目标
    routeConfig: {
      route: '/finance'
    }
  })
}
```

### 2. 页面内绑定逻辑 (registerPageTool)

在业务组件内，你只需要关注如何处理该工具的逻辑，无需再次声明或配置。

```vue
<!-- src/views/finance/index.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { registerPageTool } from '@opentiny/next-sdk'

let cleanup: (() => void) | undefined

onMounted(() => {
  // 绑定具体执行逻辑，需与声明时的 route 路径对应
  cleanup = registerPageTool({
    route: '/finance',
    handlers: {
      'finance_summary_query': async ({ month }) => {
        // 执行具体的财务查询逻辑...
        return { content: [{ type: 'text', text: `11月净收入：¥10,000` }] }
      }
    }
  })
})

onUnmounted(() => cleanup?.())
</script>
```

---

## 第三步：接入远程遥控 (WebAgent，可选)

> [!NOTE]
> **适用场景**：这是增强功能。只有在你需要通过手机远程操控、或将本地工具能力暴露给远端 AI Agent 平台时才需要配置。如果仅需在当前网页中使用 AI 对话，可跳过此步。

WebAgent 可以将当前页面的 WebMCP 能力桥接到远端平台，通过一个会话 ID 即可实现跨设备（如手机控制电脑）遥控。

### 1. 编写 useWebAgentServer.ts

该文件负责建立与远程代理服务器的 WebSocket 连接。

```ts
// src/mcp-servers/useWebAgentServer.ts
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient()
const SESSION_ID_KEY = 'web-agent-session-id'

export const useWebAgentServer = async () => {
  // 从本地存储读取，确保刷新页面后识别码保持不变
  const cachedSessionId = localStorage.getItem(SESSION_ID_KEY) ?? undefined

  const { sessionId } = await client.connect({
    sessionId: cachedSessionId,
    agent: true,    // 开启代理模式
    builtin: true,  // 代理内置的 WebMCP 工具
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })

  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return { sessionId }
}
```

### 2. 在 App.vue 中集成

在应用根组件中初始化远程服务，并将获取到的 `sessionId` 填充到 `TinyRemoter` 的菜单中。

```vue
<!-- App.vue (部分逻辑) -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWebAgentServer } from './mcp-servers/useWebAgentServer'

const menuItems = ref([])
const AGENT_ROOT = 'https://agent.opentiny.design'

onMounted(async () => {
  try {
    const { sessionId } = await useWebAgentServer()
    if (sessionId) {
      const remoteUrl = `${AGENT_ROOT}/mcp?sessionId=${sessionId}`
      
      // 在 AI 助手的菜单中添加遥控信息
      menuItems.value = [
        {
          action: 'remote-url',
          text: '遥控器链接',
          desc: remoteUrl, // 完整链接，点击可复制
          active: true,
          showCopyIcon: true
        },
        {
          action: 'remote-control',
          text: '识别码',
          desc: sessionId.slice(-6), // 展示后 6 位作为识别码
          know: true,
          showCopyIcon: true
        }
      ]
    }
  } catch (err) {
    console.warn('[WebAgent] 远程连接初始化失败，本地对话仍可正常运行：', err)
  }
})
</script>
```

---

## 第四步：接入 TinyRemoter 对话面板 (App.vue)

在根组件中配置面板，并加载相关的技能知识库。

```vue
<!-- src/App.vue -->
<template>
  <div class="main-layout">
    <router-view />
    <TinyRemoter
      :show="show"
      :skills="skillMdModules"
      :mcpServers="mcpServers"
      :menuItems="menuItems"
      title="智能助手"
      :llmConfig="llmConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const nav = navigator as any
const show = ref(true)

const mcpServers = {
  'builtin-webmcp': {
    type: 'builtin' as const,
    // 【重要】Client 端仅连接 modelContextTesting 接口
    client: nav.modelContextTesting
  }
}

const llmConfig = {
  /* 模型配置... */
}

// 加载 skills 目录下所有 Markdown 文件（含子目录）
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>
</script>
```

---

## 方案决策对比

| 特性             | 原生内置 WebMCP (按需)                  | 分离式全量注册 (全局)                    |
| ---------------- | --------------------------------------- | ---------------------------------------- |
| **推荐段位**     | **中大型、复杂业务系统**                | **小型、功能单一应用**                   |
| **AI 幻觉风险**  | **极低**（工具随页面动态上线）          | 中（工具全局常驻，上下文负载随规模增加） |
| **路由跳转依赖** | 依赖 **WebSkills** 指引或大模型主动跳转 | 依赖工具自身的 **routeConfig** 声明      |
| **实现复杂度**   | 稍高（需配置 Skills 引导词）            | 极低（一站式注册即可用）                 |

---

## 常见问题 (FAQ)

### 1. 为什么不用从 SDK 导入 `modelContext`？

通过 `initializeBuiltinWebMCP()` 已经为全局环境注入了 `navigator.modelContext`。直接使用原生 API 可以保持代码的简洁性。

### 2. 路由跳转失败怎么办？

请确保在 `main.ts` 的 `setNavigator` 中捕获并处理了 `NavigationFailure`。
