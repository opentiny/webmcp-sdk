# Vue 工程接入 WebMCP + WebSkills 最佳实践

本文将以一个完整的**商品管理后台**为示例，带你一步步把普通 Vue 工程升级为 AI 驱动的智能应用。完成后，用户可以通过自然语言对话查询数据、触发业务操作，AI 还能自动跳转到对应页面并在页面内执行逻辑。

## 核心概念

在开始之前，先理解三个模块的职责：

| 模块 | 包名 | 职责 |
|------|------|------|
| **WebMCP Server** | `@opentiny/next-sdk` | 在浏览器中运行的 MCP 工具服务器，注册可供 AI 调用的工具 |
| **Page Tool Bridge** | `@opentiny/next-sdk` | 工具调用时自动导航到目标页面，并通过消息通信执行页面内逻辑 |
| **WebSkills** | `@opentiny/next-sdk` + `@opentiny/next-remoter` | 结构化知识包，让 AI 获得特定领域的角色和文档知识 |
| **TinyRemoter** | `@opentiny/next-remoter` | AI 对话面板组件，集成 LLM + MCP + Skills |

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
├── mcp-servers/                     # ③ MCP 工具定义
│   ├── index.ts                     # MCP Server 入口
│   ├── product-guide/
│   │   └── tools.ts                 # 产品查询工具
│   └── price-protection/
│       └── tools.ts                 # 价保管理工具
├── views/
│   ├── product-list/
│   │   └── index.vue                # ④ 页面内注册工具处理器
│   └── price-protection/
│       └── index.vue                # ④ 页面内注册工具处理器
└── skills/                          # ⑥ AI 技能知识库
    └── product-guide/
        ├── SKILL.md
        └── reference/
            └── product-shangjia.md
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

> **注意**：`setNavigator` 只需在应用入口调用一次，全局生效。

---

## 第二步：配置路由

确保每个有 MCP 工具处理器的页面都有对应路由，路由路径与后续工具注册的 `route` 字段保持一致。

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

## 第三步：定义 MCP 工具

### 3.1 创建 MCP Server 入口

```ts
// src/mcp-servers/index.ts
import { WebMcpServer, createMessageChannelPairTransport, withPageTools } from '@opentiny/next-sdk'
import registerProductGuideTools from './product-guide/tools'
import registerPriceProtectionTools from './price-protection/tools'

const rawServer = new WebMcpServer()
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// withPageTools 包装后，registerTool 第三个参数支持路由配置对象
export const server = withPageTools(rawServer)

// clientTransport 导出给 TinyRemoter 使用
export { clientTransport }

export const createMcpServer = async () => {
  registerProductGuideTools(server)
  registerPriceProtectionTools(server)
  // 最后建立连接，确保所有工具已注册完毕
  await rawServer.connect(serverTransport)
}
```

### 3.2 注册产品查询工具

```ts
// src/mcp-servers/product-guide/tools.ts
import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

const registerProductGuideTools = (server: PageAwareServer) => {
  server.registerTool(
    'product-guide',
    {
      title: '产品指南',
      description: '根据产品 ID 获取产品详细信息，包含名称、价格、库存、状态等字段',
      inputSchema: {
        productId: z.string().describe('产品 ID')
      }
    },
    // 第三个参数传路由配置：工具被调用时自动跳转到 /product-list
    // 页面加载完成后，通过 postMessage 把 input 转发给页面内的处理器
    { route: '/product-list' }
  )
}

export default registerProductGuideTools
```

### 3.3 注册价保管理工具（多工具绑定同一路由）

```ts
// src/mcp-servers/price-protection/tools.ts
import { z } from '@opentiny/next-sdk'
import type { PageAwareServer } from '@opentiny/next-sdk'

const registerPriceProtectionTools = (server: PageAwareServer) => {
  // 多个工具可以绑定同一个路由，工具名全局唯一即可
  server.registerTool(
    'price-protection-query',
    {
      title: '查询价保申请',
      description: '查询价保申请列表，可按状态筛选（pending/approved/rejected/expired），不传则返回全部',
      inputSchema: {
        status: z
          .enum(['pending', 'approved', 'rejected', 'expired'])
          .optional()
          .describe('申请状态，不传则查询全部')
      }
    },
    { route: '/price-protection' }
  )

  server.registerTool(
    'price-protection-review',
    {
      title: '审批价保申请',
      description: '对待审核的价保申请进行审批，支持通过（approve）或拒绝（reject），可附加备注',
      inputSchema: {
        id: z.number().describe('价保申请 ID'),
        action: z.enum(['approve', 'reject']).describe('审批动作：approve=通过，reject=拒绝'),
        remark: z.string().optional().describe('审批备注（可选）')
      }
    },
    { route: '/price-protection' }
  )

  server.registerTool(
    'price-protection-detail',
    {
      title: '价保申请详情',
      description: '根据申请 ID 获取单条价保申请的完整详情',
      inputSchema: {
        id: z.number().describe('价保申请 ID')
      }
    },
    { route: '/price-protection' }
  )
}

export default registerPriceProtectionTools
```

> **两种工具注册方式对比：**
>
> | 方式 | 第三个参数 | 适用场景 |
> |------|-----------|---------|
> | 回调函数 | `async (input) => { return { content: [...] } }` | 工具逻辑简单，不需要访问页面状态或 Vue 响应式数据 |
> | 路由配置 | `{ route: '/some-path' }` | 工具需要读写页面状态，或需要在特定页面内执行业务逻辑 |

---

## 第四步：在页面内注册工具处理器

这是 Page Tool Bridge 的核心——在页面挂载时注册处理器，卸载时清除。路由路径由 SDK 自动从 `window.location.pathname` 获取，无需手动传入。

### 4.1 产品查询页面

```vue
<!-- src/views/product-list/index.vue -->
<template>
  <div class="products-page">
    <!-- 你的页面内容 -->
    <div v-for="product in products" :key="product.id">
      {{ product.name }} - ¥{{ product.price }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { registerPageTool } from '@opentiny/next-sdk'
import productsData from './products.json'

type Product = {
  id: number
  name: string
  price: number
  stock: number
  status: 'on' | 'off' | string
}

const products = ref<Product[]>(productsData as Product[])

// registerPageTool 返回 cleanup 函数，在 onUnmounted 中调用
let cleanupPageTool: () => void

onMounted(() => {
  cleanupPageTool = registerPageTool({
    handlers: {
      // key 必须与 mcp-servers 中注册的工具名一致
      'product-guide': async ({ productId }: { productId: string }) => {
        const product = products.value.find((p) => String(p.id) === productId)
        const text = product
          ? `产品信息：${JSON.stringify(product, null, 2)}`
          : `未找到产品 ID 为 ${productId} 的商品`
        // 返回格式遵循 MCP 协议：content 数组，每项包含 type 和内容
        return { content: [{ type: 'text', text }] }
      }
    }
  })
})

// 页面卸载时取消注册，避免内存泄漏和消息串扰
onUnmounted(() => cleanupPageTool?.())
</script>
```

### 4.2 价保管理页面（多工具处理器）

```vue
<!-- src/views/price-protection/index.vue -->
<template>
  <!-- 你的页面内容 -->
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { registerPageTool } from '@opentiny/next-sdk'
import rawData from './price-protection.json'

const records = ref(rawData as any[])

let cleanupPageTool: () => void

onMounted(() => {
  cleanupPageTool = registerPageTool({
    handlers: {
      // 一个页面可以注册多个工具的处理器
      'price-protection-query': async ({ status }: { status?: string }) => {
        const result = status
          ? records.value.filter((r) => r.status === status)
          : records.value
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      },

      'price-protection-review': async ({
        id,
        action,
        remark
      }: {
        id: number
        action: 'approve' | 'reject'
        remark?: string
      }) => {
        const record = records.value.find((r) => r.id === id)
        if (!record) {
          return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的申请` }] }
        }
        record.status = action === 'approve' ? 'approved' : 'rejected'
        record.remark = remark ?? (action === 'approve' ? '审核通过' : '不符合条件')
        return {
          content: [{ type: 'text', text: `申请 ${id} 已${action === 'approve' ? '通过' : '拒绝'}` }]
        }
      },

      'price-protection-detail': async ({ id }: { id: number }) => {
        const record = records.value.find((r) => r.id === id)
        if (!record) {
          return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的申请` }] }
        }
        return { content: [{ type: 'text', text: JSON.stringify(record, null, 2) }] }
      }
    }
  })
})

onUnmounted(() => cleanupPageTool?.())
</script>
```

> **处理器编写规范：**
> - handler 的参数类型由对应工具的 `inputSchema` 决定，命名完全对应
> - 返回值必须是 `{ content: Array<{ type: 'text', text: string }> }` 格式
> - handler 内部可以访问任何 Vue 响应式数据（`ref`、`reactive`、`computed`、Pinia Store 等）
> - 抛出异常会被 SDK 捕获并以错误信息返回给 AI

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
      sessionId="my-app-session"
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
// import.meta.glob 是 Vite 特性，eager: true 表示同步加载
const skillMdModules = import.meta.glob('./skills/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

// 将本地 MCP Server 注册到 TinyRemoter
// key 为服务器名称（自定义），type: 'local' 表示浏览器本地运行
const mcpServers = {
  'my-mcp-server': {
    type: 'local',
    transport: clientTransport
  }
}

// 启动 MCP Server（注册工具 + 建立通信通道）
onMounted(async () => {
  await createMcpServer()
})
</script>
```

---

## 第六步：配置 WebSkills（可选但推荐）

Skills 让 AI 获得特定领域的角色和文档知识。当用户提问时，AI 会自动识别意图并读取对应技能的参考资料。

### 6.1 创建技能目录

```bash
mkdir -p src/skills/product-guide/reference
```

### 6.2 编写 SKILL.md 入口

```markdown
<!-- src/skills/product-guide/SKILL.md -->
---
name: product-guide
description: 商品管理指南技能包。提供商品管理相关的搜索和查询功能。当用户询问商品创建、库存管理、价格设置、上架流程等问题时使用。
---

# 商品管理指南

这是一个商品管理指南技能包，包含多个子技能。

## 可用参考资料

- 商品上架流程：'./reference/product-shangjia.md'
```

> **description 字段非常重要**：AI 依赖此字段决定何时激活该技能，请尽量描述清楚技能的使用场景。

### 6.3 添加参考资料文件

```markdown
<!-- src/skills/product-guide/reference/product-shangjia.md -->
---
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
LLM 识别意图，决定调用 product-guide 工具，参数 { productId: "123" }
    ↓
MCP Client 通过 MessageChannel 发送工具调用请求
    ↓
MCP Server（withPageTools）拦截，发现绑定路由 /product-list
    ↓
检查 /product-list 是否已激活？
    ↓ 未激活                     ↓ 已激活
调用 setNavigator 跳转      直接通过 postMessage 发送
路由跳转到 /product-list         工具调用消息
页面挂载，执行 registerPageTool
广播 page-ready 信号
    ↓
SDK 收到 page-ready，发送工具调用消息 { toolName: 'product-guide', input: { productId: '123' } }
    ↓
页面内 handleMessage 匹配到 product-guide 处理器
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
- 页面未调用 `registerPageTool`，或 handler 中对应的工具名拼写有误
- 路由配置的 `route` 路径与实际路由 `path` 不一致
- `registerPageTool` 在 `onMounted` 之外调用，导致 `window.location.pathname` 取到了错误路径

### 工具名大小写要注意

`server.registerTool('product-guide', ...)` 中的工具名必须与 `registerPageTool` handlers 中的 key **完全一致**（大小写敏感）。

### 多个工具共用一个路由

只需将多个 `server.registerTool` 都传 `{ route: '/same-path' }`，页面内的 `registerPageTool` 在 handlers 中列出所有工具名即可。

### 如何在不跳转的情况下使用工具？

若工具逻辑不依赖页面状态，直接传回调函数作为第三个参数：

```ts
server.registerTool('get-time', { title: '获取当前时间', description: '...' }, async () => {
  return { content: [{ type: 'text', text: new Date().toLocaleString() }] }
})
```

### Skills 未被 AI 识别？

- 检查 `SKILL.md` 文件名大小写（必须完全为 `SKILL.md`）
- 确认 YAML Front Matter 中 `description` 字段内容详细，包含使用场景关键词
- 在控制台打印 `Object.keys(skillMdModules)` 确认文件已被正确加载
