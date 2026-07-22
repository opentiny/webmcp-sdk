# Vue 工程接入 WebMCP + WebSkills 最佳实践

本文根据最新的 WebMCP 标准与 `doc-ai` 示例项目，带你一步步把普通 Vue 工程升级为 AI 驱动的智能应用。

> **核心变化**：统一使用浏览器原生的 `document.modelContext` 接口。路由跳转由业务侧**自行注册** `navigate_to_page`；跳转后调用 SDK 的 `waitForRouteTools(path, routeToolsMap)` 确认目标页工具已就绪。
> **示例工程仓库**：[`packages/doc-ai`](https://github.com/opentiny/next-sdk/tree/dev/packages/doc-ai)

---

## 核心概念

1. **标准 API**：使用 `document.modelContext` 注册工具。
2. **全平台 Polyfill**：`initializeBuiltinWebMCP()` 确保各浏览器可用。
3. **自配导航 + 握手**：业务维护 `routeToolsMap` 并自行注册导航工具；SDK 仅提供 `waitForRouteTools` 判断 path 对应工具是否全部加载。

| 模块 | 职责 |
| --- | --- |
| **Model Context** | 浏览器原生接口，用于注册工具 |
| **navigate_to_page（业务模版）** | 用户自配的路由跳转工具 |
| **waitForRouteTools（SDK）** | 按 path + routeToolsMap 握手等待页面工具就绪 |
| **WebSkills** | 业务知识 Markdown，引导跨页意图 |
| **WebAgent** | 远程代理，手机/异地遥控当前页工具 |

---

## 推荐目录结构

```text
src/
├── main.ts                 # initializeBuiltinWebMCP
├── App.vue                 # TinyRemoter + Skills + WebAgent；启动 createMcpServer
├── mcp-servers/
│   ├── navigate-tool.ts    # 【可复制】自配导航 + routeToolsMap + waitForRouteTools
│   ├── index.ts            # 调用 registerNavigateToPageTool(router)
│   └── useWebAgentServer.ts
├── skills/                 # WebSkills 知识库
└── views/                  # 业务页内 onMounted registerTool
```

---

## 第一步：环境初始化 (main.ts)

```ts
// src/main.ts
import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

initializeBuiltinWebMCP()

const app = createApp(App)
app.use(router)
app.mount('#app')
```

在 `App.vue`（或入口逻辑）中于 Polyfill 就绪后调用 `createMcpServer()`，内部注册导航工具（见下一步）。

---

## 第二步：自配路由跳转工具（可复制模版）

将下列文件复制到工程 `src/mcp-servers/navigate-tool.ts`，按业务修改 `routeToolsMap`。握手调用 SDK 的 `waitForRouteTools`，无需手写 `toolchange` / 轮询逻辑。

完整示例见：[`packages/doc-ai/src/mcp-servers/navigate-tool.ts`](https://github.com/opentiny/next-sdk/blob/dev/packages/doc-ai/src/mcp-servers/navigate-tool.ts)

```ts
/**
 * 可复制模版：自配路由跳转工具（Vue + vue-router）
 */
import type { Router } from 'vue-router'
import { isNavigationFailure, NavigationFailureType, type NavigationFailure } from 'vue-router'
import { waitForRouteTools, type RouteToolsMap } from '@opentiny/next-sdk'

/** 路由 → 该页必须就绪的工具名（按模块命名，全局唯一） */
export const routeToolsMap: RouteToolsMap = {
  '/orders': ['order_query', 'order_detail'],
  '/finance': ['finance_summary_query'],
  '/inventory': ['add_inventory'],
  '/sales': ['sales_record_query'],
  '/price-protection': [
    'price-protection-query',
    'price-protection-review',
    'price-protection-detail',
    'add_price_protection'
  ]
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, '') || '/'
}

/** 注册 navigate_to_page */
export function registerNavigateToPageTool(router: Router): void {
  const modelContext = (document as any).modelContext
  if (!modelContext?.registerTool) {
    throw new Error('modelContext 不可用，请先 initializeBuiltinWebMCP()')
  }

  modelContext.registerTool({
    name: 'navigate_to_page',
    title: '页面跳转',
    description:
      '当需要的工具在当前页面不可用时，使用此工具跳转到特定页面。例如：查询订单跳转到 "/orders"。',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: '目标页面路由，例如 "/orders"、"/inventory"、"/finance"'
        }
      },
      required: ['path']
    },
    execute: async ({ path }: { path: string }) => {
      const normalized = normalizePath(path)
      const hasMap = Array.isArray(routeToolsMap[normalized])

      const failure = await router.push(normalized)
      if (failure) {
        if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
          // 已在目标页：仍做工具就绪检查
        } else {
          throw new Error(`页面跳转失败: ${(failure as NavigationFailure).message}`)
        }
      }

      await waitForRouteTools(normalized, routeToolsMap, { timeoutMs: 5000, pollMs: 100 })

      const hint = hasMap
        ? '页面工具已就绪，请继续下一步操作。'
        : '该路由未配置工具清单（routeToolsMap），仅完成路由跳转。'
      return {
        content: [{ type: 'text', text: `已跳转至页面：${normalized}。${hint}` }]
      }
    }
  })
}
```

注册入口：

```ts
// src/mcp-servers/index.ts
import { registerNavigateToPageTool } from './navigate-tool'
import router from '../router'

export const createMcpServer = async () => {
  registerNavigateToPageTool(router)
}
```

约定：

1. 维护 `routeToolsMap`：键为规范化 path，值为该页工具名全集（与页面内 `registerTool` 的 `name` 一致）。
2. 跳转后调用 `waitForRouteTools(path, routeToolsMap)`；map 无该 path 时 helper 立即返回。
3. 可选传入 `timeoutMs` / `pollMs`（默认 5s / 100ms）。

---

## 第三步：在页面组件中定义工具

在页面内按需注册，工具名与 `routeToolsMap` 对齐：

```vue
<!-- src/views/product-detail/index.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const modelContext = (document as any).modelContext
const abortController = new AbortController()

onMounted(() => {
  if (!modelContext) return

  modelContext.registerTool(
    {
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
    },
    { signal: abortController.signal }
  )
})

onUnmounted(() => {
  abortController.abort()
})
</script>
```

---

## 第四步：接入远程遥控 (WebAgent，可选)

> [!NOTE]
> 仅在需要手机远程操控或暴露给远端 Agent 时配置。

```ts
// src/mcp-servers/useWebAgentServer.ts
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient()
const SESSION_ID_KEY = 'web-agent-session-id'

export const useWebAgentServer = async () => {
  const cachedSessionId = localStorage.getItem(SESSION_ID_KEY) ?? undefined

  const { sessionId } = await client.connect({
    sessionId: cachedSessionId,
    agent: true,
    builtin: true,
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })

  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return { sessionId }
}
```

---

## 第五步：接入 TinyRemoter 对话面板 (App.vue)

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
import '@opentiny/next-remoter/dist/style.css'
import { createMcpServer, useWebAgentServer } from './mcp-servers'

const show = ref(true)
const menuItems = ref([])

const mcpServers = {
  'builtin-webmcp': {
    type: 'builtin' as const,
    client: document.modelContext
  }
}

const llmConfig = {
  /* 模型配置... */
}

const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

onMounted(async () => {
  await createMcpServer()
  try {
    const { sessionId } = await useWebAgentServer()
    // 将 sessionId 填入 menuItems...
  } catch (err) {
    console.warn('[WebAgent] 远程连接初始化失败：', err)
  }
})
</script>
```

---

## 方案要点

| 项 | 说明 |
| --- | --- |
| **业务工具** | 页面内 `registerTool` + `AbortController` |
| **跨页跳转** | 自配 `navigate_to_page` + SDK `waitForRouteTools(path, routeToolsMap)` |
| **引导** | WebSkills 描述何时应先 `navigate_to_page` |
| **已移除** | SDK 不再提供 `setNavigator` / `routeConfig` / `registerPageTool` |

---

## 常见问题 (FAQ)

### 1. 为什么不用从 SDK 导入 `modelContext`？

`initializeBuiltinWebMCP()` 已注入 `document.modelContext`，直接使用原生 API 即可。

### 2. 路由跳转后工具仍不可用？

检查：`routeToolsMap` 是否包含该 path；页面工具 `name` 是否与 map 一致；页面是否在 `onMounted` 中完成 `registerTool`；握手是否超时（可调大 `timeoutMs`）。

### 3. NavigationFailure 怎么处理？

模版已在 `router.push` 后处理 `duplicated`；其它失败会抛错给工具调用方。
