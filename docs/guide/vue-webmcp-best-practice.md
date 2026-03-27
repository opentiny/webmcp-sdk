# Vue 工程接入 WebMCP + WebSkills 最佳实践

本文将以一个完整的**商品管理后台**为示例，带你一步步把普通 Vue 工程升级为 AI 驱动的智能应用。完成后，用户可以通过自然语言对话查询数据、触发业务操作，AI 还能自动跳转到对应页面并在页面内执行逻辑。
 
> **示例工程仓库**：[`packages/doc-ai`](https://github.com/opentiny/next-sdk/tree/dev/packages/doc-ai)

## 破坏性变更（Breaking Change）

> 新版本已移除 `TinyRemoter` 的 `pageToolsOnDemand` 属性。

- 旧配置 `:pageToolsOnDemand="true"` 需要删除；
- Remoter 统一通过 `listTools` 实时感知工具目录变化；
- 页面工具调用与路由跳转机制不变，推荐由 `withPageTools` / `registerNavigateTool` / 页面内 `registerTool` 协作完成。

迁移建议：

1. 推荐改为页面内一体化定义：在业务页面内 `server.registerTool`，并在页面卸载时 `server.unregisterTool`。
2. 若继续使用“分离式定义”（`mcp-servers`），也只需删除 `pageToolsOnDemand` 配置。

## 核心概念

在开始之前，先理解三个模块的职责：

| 模块                 | 包名                                            | 职责                                                       |
| -------------------- | ----------------------------------------------- | ---------------------------------------------------------- |
| **WebMCP Server**    | `@opentiny/next-sdk`                            | 在浏览器中运行的 MCP 工具服务器，注册可供 AI 调用的工具    |
| **Page Tool Bridge** | `@opentiny/next-sdk`                            | 工具调用时自动导航到目标页面，并通过消息通信执行页面内逻辑 |
| **WebSkills**        | `@opentiny/next-sdk` + `@opentiny/next-remoter` | 结构化知识包，让 AI 获得特定领域的角色和文档知识           |
| **TinyRemoter**      | `@opentiny/next-remoter`                        | AI 对话面板组件，集成 LLM + MCP + Skills                   |
| **WebAgent**         | `@opentiny/next-sdk`                            | 将本地 MCP Server 桥接到远端 Agent 平台，支持手机遥控      |

### 为什么需要 Page Tool Bridge？

Web MCP 与传统 MCP（运行在服务器/进程中）的本质区别在于：**Web MCP 工具是动态的、随页面生命周期开启和关闭的**。

用户不一定打开了工具对应的页面，Page Tool Bridge 解决了这个问题：

```text
AI 调用工具 → 检测目标页面是否已加载
    ↓ 未加载                ↓ 已加载
自动路由跳转          直接通过 postMessage 发送指令
    ↓
页面挂载，广播 page-ready
    ↓
发送工具调用消息 → 页面执行业务逻辑 → 返回结果
```

## 最终目录结构

完成本文所有步骤后，项目结构如下：

```text
src/
├── main.ts                          # ① 注册路由导航器
├── App.vue                          # ⑤ 接入 TinyRemoter
├── router/
│   └── index.ts                     # ② 配置路由
├── mcp-servers/
│   └── index.ts                     # ③ MCP Server 入口（推荐仅放全局工具）
├── views/
│   ├── product-list/
│   │   └── index.vue                # ④ 页面内一体化定义工具（register/unregister）
│   └── price-protection/
│       └── index.vue                # ④ 页面内一体化定义工具（register/unregister）
└── skills/                          # ⑥ AI 技能知识库
    └── product-guide/
        ├── SKILL.md
        └── reference/
            └── product-listing.md
```

## 安装依赖

```bash
pnpm add @opentiny/next-sdk @opentiny/next-remoter
```

---

## 第一步：在 main.ts 注册路由导航器

`setNavigator` 告诉 SDK 如何跳转页面。当 AI 调用某个工具而对应页面未打开时，SDK 会调用此函数自动导航。

```ts
// src/main.ts
import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import { setNavigator } from '@opentiny/next-sdk'

const app = createApp(App)
app.use(router)
app.mount('#app')

// 必须在 router 注册后调用，让 SDK 持有 router.push 的引用
setNavigator((route) => router.push(route))
```

> **注意**：`setNavigator` 只需在应用入口调用一次，全局生效。该导航函数会被 SDK 用于：① withPageTools 在调用页面工具时自动跳转；② 内置的 `navigate_to_page` 工具（通过 `registerNavigateTool` 注册）在大模型主动请求跳转时使用。

---

## 第二步：配置路由

确保每个有页面工具的页面都有对应路由，并与 `navigate_to_page` 的目标路径保持一致。

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/home/index.vue')
    },
    {
      path: '/product-list',
      component: () => import('../views/product-list/index.vue')
    },
    {
      path: '/price-protection',
      component: () => import('../views/price-protection/index.vue')
    }
  ]
})

export default router
```

---

## 第三步：创建 MCP Server（推荐：仅保留全局工具）

推荐把 `mcp-servers/index.ts` 保持精简，只注册全局能力（如 `navigate_to_page`），业务工具放到页面内定义。

```ts
// src/mcp-servers/index.ts
import {
  WebMcpServer,
  createMessageChannelPairTransport,
  withPageTools,
  registerNavigateTool
} from '@opentiny/next-sdk'

const rawServer = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 保留 withPageTools：兼容路由型工具链路 + 浏览器内置 MCP 能力
export const server = withPageTools(rawServer)
export { clientTransport }

export const createMcpServer = async () => {
  // 注册通用页面跳转工具（推荐保留）
  registerNavigateTool(rawServer)
  await rawServer.connect(serverTransport)
}
```

> **页面跳转工具（navigate_to_page）**：大模型需要跨页面操作时，会先调用该工具跳转到目标路由。SDK 内部会等待页面完成就绪握手（`page-ready` / 工具目录变更）后再返回。

---

## 第四步：在业务页面内一体化定义工具（推荐）

这是当前推荐模式：工具声明（参数 schema）和回调（业务逻辑）写在同一个页面文件中。

- 页面进入：`server.registerTool(...)`
- 页面离开：`server.unregisterTool(...)`

这种方式天然实现“按需加载”：只有当前页面激活时，该页面工具才会出现在 `listTools` 中。

### 4.1 产品查询页面

```vue
<!-- src/views/product-list/index.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { z } from '@opentiny/next-sdk'
import { server } from '@/mcp-servers'
import productsData from './products.json'

type Product = {
  id: number
  name: string
  price: number
  stock: number
  status: 'on' | 'off' | string
}

const products = ref<Product[]>(productsData as Product[])
const TOOL_NAME = 'product-guide'

onMounted(() => {
  server.registerTool(
    TOOL_NAME,
    {
      title: '产品指南',
      description: '根据产品 ID 获取产品详细信息',
      inputSchema: {
        productId: z.string().describe('产品 ID')
      }
    },
    async ({ productId }: { productId: string }) => {
      const product = products.value.find((p) => String(p.id) === productId)
      const text = product ? `产品信息：${JSON.stringify(product, null, 2)}` : `未找到产品 ID 为 ${productId} 的商品`
      return { content: [{ type: 'text', text }] }
    }
  )
})

onUnmounted(() => {
  server.unregisterTool(TOOL_NAME)
})
</script>
```

### 4.2 价保管理页面（单页多工具）

```vue
<!-- src/views/price-protection/index.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { z } from '@opentiny/next-sdk'
import { server } from '@/mcp-servers'
import rawData from './price-protection.json'

const records = ref(rawData as any[])
const TOOL_NAMES = ['price-protection-query', 'price-protection-review', 'price-protection-detail']

onMounted(() => {
  server.registerTool(
    'price-protection-query',
    {
      title: '查询价保申请',
      inputSchema: {
        status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional()
      }
    },
    async ({ status }: { status?: string }) => {
      const result = status ? records.value.filter((r) => r.status === status) : records.value
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.registerTool(
    'price-protection-review',
    {
      title: '审批价保申请',
      inputSchema: {
        id: z.union([z.string(), z.number()]),
        action: z.enum(['approve', 'reject']),
        remark: z.string().optional()
      }
    },
    async ({ id, action, remark }: { id: string | number; action: 'approve' | 'reject'; remark?: string }) => {
      const record = records.value.find((r) => r.id === id)
      if (!record) return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的申请` }] }
      record.status = action === 'approve' ? 'approved' : 'rejected'
      record.remark = remark ?? (action === 'approve' ? '审核通过' : '不符合条件')
      return { content: [{ type: 'text', text: `申请 ${id} 已${action === 'approve' ? '通过' : '拒绝'}` }] }
    }
  )
})

onUnmounted(() => {
  TOOL_NAMES.forEach((name) => server.unregisterTool(name))
})
</script>
```

> **可选（仅补充）**：若你的团队需要“统一治理工具声明”，也可继续使用分离式写法（`mcp-servers` 声明 + `registerPageTool` 处理），但不作为本文主推荐路径。

---

## 第五步：在 App.vue 接入 TinyRemoter

把 MCP Server 和 Skills 统一传给 `TinyRemoter`：

```vue
<!-- src/App.vue -->
<template>
  <div class="app-container">
    <!-- 页面路由内容 -->
    <router-view />

    <!-- AI 对话面板 -->
    <TinyRemoter
      :show="true"
      :skills="skillMdModules"
      :mcpServers="mcpServers"
      title="智能助手"
      :llmConfig="llmConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createMcpServer, clientTransport } from './mcp-servers'

// LLM 配置
const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  maxSteps: 10
}

// 加载 skills 目录下所有文件（SKILL.md + 所有参考资料）
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

// 将本地 MCP Server 注册到 TinyRemoter
const mcpServers = {
  'my-mcp-server': {
    type: 'local' as const,
    transport: clientTransport
  }
}

// ⚠️ 最佳实践：本地 MCP 与远程初始化必须分开处理
// createMcpServer() 是核心功能，失败则抛出，让开发者及时发现问题
// useWebAgentServer() 是增强功能（远程遥控），失败只打印警告，不阻塞页面
onMounted(async () => {
  await createMcpServer()

  // 如果不需要远程遥控功能，到这里即可
})
</script>
```

> **为什么要分开处理？**
> 如果把本地 MCP 启动和远程 WebAgent 初始化放在同一个 `await` 链中，一旦网络抖动导致远程连接失败，整个 `onMounted` 都会 reject，本地 AI 对话功能也会随之失效。分开处理后，远程功能降级不影响本地体验。

---

## 第六步：接入远程遥控（WebAgent，可选）

通过 `useWebAgentServer`，可以将本地 MCP Server 桥接到远端 Agent 平台，获取一个 `sessionId`，之后使用手机扫码或输入识别码即可实现跨设备遥控。

### 6.1 创建 useWebAgentServer.ts

```ts
// src/mcp-servers/useWebAgentServer.ts
import { WebMcpServer, WebMcpClient, createMessageChannelPairTransport, withPageTools } from '@opentiny/next-sdk'
import { registerAllTools } from './common' // 与本地 MCP 共用的工具注册函数

const rawServer = new WebMcpServer()
const client = new WebMcpClient()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

export const server = withPageTools(rawServer)

const SESSION_ID_KEY = 'web-agent-session-id'

export const useWebAgentServer = async () => {
  registerAllTools(server)

  await rawServer.connect(serverTransport)
  await client.connect(clientTransport)

  // 从 localStorage 读取上次的 sessionId（刷新后可复用同一遥控会话）
  const cachedSessionId = localStorage.getItem(SESSION_ID_KEY) ?? undefined

  const { sessionId } = await client.connect({
    sessionId: cachedSessionId,
    agent: true,
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })

  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return { sessionId }
}
```

> **注意**：`rawServer`、`client`、`transport` 均为模块级单例，该文件**只应在应用生命周期内被调用一次**（通过 `onMounted` 中的 `try/catch` 保障，详见下方）。若需要支持热重载或多次调用场景，可在函数顶部加 `initialized` 标志做幂等保护。

### 6.2 在 App.vue 中集成（含错误隔离）

```vue
<!-- src/App.vue（片段）-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { MenuItemConfig } from '@opentiny/next-remoter'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createMcpServer, clientTransport } from './mcp-servers'
import { useWebAgentServer } from './mcp-servers/useWebAgentServer'
import { AGENT_ROOT } from './const'

const mcpServers = {
  'my-mcp-server': { type: 'local' as const, transport: clientTransport }
}

// 远程遥控菜单项（会在 WebAgent 初始化成功后填充）
const menuItems = ref<MenuItemConfig[]>([])

onMounted(async () => {
  // ① 本地 MCP 核心功能：失败直接抛出，不容忽视
  await createMcpServer()

  // ② 远程遥控增强功能：失败只打印警告，不影响本地对话
  try {
    const result = await useWebAgentServer()
    if (result?.sessionId) {
      const remoteUrl = `${AGENT_ROOT}/mcp?sessionId=${result.sessionId}`
      menuItems.value = [
        {
          action: 'remote-url',
          text: '遥控器链接',
          desc: remoteUrl, // 存完整 URL（含 sessionId），复制时不会丢失会话
          tip: remoteUrl,
          active: true,
          showCopyIcon: true
        },
        {
          action: 'remote-control',
          text: '识别码',
          desc: result.sessionId.slice(-6),
          know: true,
          showCopyIcon: true
        }
      ]
    }
  } catch (err) {
    console.warn('[WebAgent] 远程遥控初始化失败，本地功能不受影响：', err)
  }
})
</script>
```

> **`desc` 字段的重要性**：为 `remote-url` 菜单项设置 `desc` 时，请务必传入**完整的带 `sessionId` 的 URL**，而不是裸域名。`TinyRemoter` 的复制按钮会优先读取 `desc` 字段，若 `desc` 只是域名，用户复制到的链接将无法建立遥控会话。

### 6.3 menuItems 字段说明

| 字段           | 类型      | 说明                                                                                                       |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `action`       | `string`  | 菜单标识：`remote-url`（遥控链接）/ `remote-control`（识别码）/ `qr-code`（二维码）/ `ai-chat`（打开对话） |
| `text`         | `string`  | 菜单项标题                                                                                                 |
| `desc`         | `string`  | 副标题/描述，`remote-url` 场景下应存完整链接（含 sessionId）                                               |
| `tip`          | `string`  | hover tooltip 文字                                                                                         |
| `active`       | `boolean` | 描述文字高亮为蓝色                                                                                         |
| `know`         | `boolean` | 描述文字高亮为深色（用于识别码）                                                                           |
| `showCopyIcon` | `boolean` | 是否显示复制图标按钮                                                                                       |

---

## 第七步：配置 WebSkills（可选但推荐）

Skills 让 AI 获得特定领域的角色和文档知识。当用户提问时，AI 会自动识别意图并读取对应技能的参考资料。

### 6.1 创建技能目录

```bash
mkdir -p src/skills/product-guide/reference
```

### 6.2 编写 SKILL.md 入口

```markdown
## <!-- src/skills/product-guide/SKILL.md -->

name: product-guide
description: 商品管理指南技能包。提供商品管理相关的搜索和查询功能。当用户询问商品创建、库存管理、价格设置、上架流程等问题时使用。

---

# 商品管理指南

这是一个商品管理指南技能包，包含多个子技能。

## 可用参考资料

- 商品上架流程：'./reference/product-listing.md'
```

> **description 字段非常重要**：AI 依赖此字段决定何时激活该技能，请尽量描述清楚技能的使用场景。

### 6.3 添加参考资料文件

```markdown
## <!-- src/skills/product-guide/reference/product-listing.md -->

title: 商品上架
tags: [商品管理, 上架, 库存]

---

# 商品上架

## 基本流程

1. 进入商品管理，找到待上架商品
2. 补全必填项：主图、标题、类目、价格、库存
3. 自检：类目是否正确，是否有违规内容
4. 点击上架，在前台确认商品已展示
```

参考资料支持 `.md`、`.json`、`.xml`、`.txt` 等任意文本格式，可按需扩展。

---

## 完整数据流说明

以用户对话「帮我查一下产品 ID 为 123 的信息」为例，完整流程如下：

```text
用户发送消息
    ↓
TinyRemoter 将消息发给 LLM
    ↓
LLM 先调用 navigate_to_page，参数 { path: "/product-list" }
    ↓
MCP Client 通过 MessageChannel 发送页面跳转请求
    ↓
MCP Server 调用 setNavigator 跳转到 /product-list
    ↓
页面挂载，执行 server.registerTool
工具目录更新并完成 page-ready 握手
    ↓
LLM 重新读取 listTools，发现 product-guide 工具已激活
    ↓
SDK 发送工具调用消息 { toolName: 'product-guide', input: { productId: '123' } }
    ↓
MCP Server 执行 product-guide 回调
    ↓
执行业务逻辑：从 products.value 中查找 id === '123' 的商品
    ↓
返回结果 { content: [{ type: 'text', text: '产品信息: ...' }] }
    ↓
LLM 获得工具返回结果，生成自然语言回复
    ↓
TinyRemoter 展示最终回复给用户
```

---

## 常见问题

### 工具调用超时？

默认超时 30 秒。常见原因：

- 页面未执行 `server.registerTool`（或执行时机过晚），导致工具未进入目录
- 页面卸载时未正确 `server.unregisterTool`，造成旧工具残留或状态错乱
- 工具名拼写不一致（注册名与调用名不一致）

### 工具名大小写要注意

`server.registerTool('product-guide', ...)` 中的工具名是全局唯一标识，调用时必须**完全一致**（大小写敏感）。

### 一个页面定义多个工具

在同一页面内多次调用 `server.registerTool` 即可；建议统一维护一个 `TOOL_NAMES` 数组，并在 `onUnmounted` 里批量 `unregisterTool`。

### 如何让 AI 先跳转再使用页面工具？

使用 `registerNavigateTool(rawServer)` 注册内置的 `navigate_to_page` 工具后，大模型在需要时会先调用该工具跳转到目标路由（如 `/orders`）。SDK 内部会等待目标页面完成就绪握手后再返回，下一步即可正确调用目标页面工具，无需在业务中手写等待或超时逻辑。

### 还可以用分离式定义吗？

可以。分离式（`mcp-servers` + `registerPageTool`）仍兼容，但本文推荐默认采用页面内一体化定义，降低认知和维护成本。

### Skills 未被 AI 识别？

- 检查 `SKILL.md` 文件名大小写（必须完全为 `SKILL.md`）
- 确认 YAML Front Matter 中 `description` 字段内容详细，包含使用场景关键词
- 在控制台打印 `Object.keys(skillMdModules)` 确认文件已被正确加载

### 远程遥控报错但本地对话没有问题？

这是预期行为。`useWebAgentServer` 依赖网络请求连接远端 Agent 平台，在网络受限或服务不可用时会失败。只要 `onMounted` 中用 `try/catch` 单独包裹了远程初始化（见第六步），本地 MCP 和对话功能不受任何影响。

### 刷新页面后遥控会话失效？

`useWebAgentServer` 内部会把 `sessionId` 持久化到 `localStorage`（key 为 `web-agent-session-id`），下次加载时自动读取并复用，正常情况下无需重新扫码。若 sessionId 确实失效（服务端过期），Agent 平台会分配新 sessionId 并自动写回。

### 复制「遥控器链接」只复制到了域名？

请检查 `menuItems` 中 `remote-url` 项的 `desc` 字段是否包含完整的 `sessionId` 参数：

```ts
// ✅ 正确：desc 存完整链接
{ action: 'remote-url', desc: `${AGENT_ROOT}/mcp?sessionId=${result.sessionId}`, ... }

// ❌ 错误：desc 只存了裸域名，复制后无法建立遥控会话
{ action: 'remote-url', desc: AGENT_ROOT, ... }
```

`TinyRemoter` 的复制按钮会优先使用 `desc` 字段，只有当 `desc` 不存在或与 `remoteUrl` 选项相同时才会自动拼接 `sessionId`。
