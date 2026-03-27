# Angular 工程接入 WebMCP + WebSkills 最佳实践

本文将以一个完整的**商品管理后台**为示例，带你一步步把普通 Angular 工程升级为 AI 驱动的智能应用。完成后，用户可以通过自然语言对话查询数据、触发业务操作，AI 还能自动跳转到对应页面并在页面内执行逻辑。

与 Vue 版本的核心差异在于：**TinyRemoter 是 Vue 的 AI 对话组件**，Angular 无法直接引用，需通过 **iframe + MessageChannel 跨窗口连接** 将主应用与 Remoter 打通。

> **示例工程仓库**：[`packages/doc-ai-angular`](https://github.com/opentiny/next-sdk/tree/dev/packages/doc-ai-angular)

## 破坏性变更（Breaking Change）

> 新版本已移除 `TinyRemoter` 的 `pageToolsOnDemand` 属性。

- 旧配置 `:pageToolsOnDemand="true"` 需要删除；
- Remoter 统一通过 `listTools` 实时感知工具目录变化；
- Page Tool Bridge 调用链路不变，推荐使用页面内 `registerTool/unregisterTool` 按需注册工具。

迁移建议：

1. 推荐改为页面内一体化定义：在 Angular 页面组件生命周期中直接 `server.registerTool` / `server.unregisterTool`。
2. 若仍使用 `mcp-servers` 分离式定义，也只需删除 `pageToolsOnDemand` 配置即可。

## 核心概念

在开始之前，先理解各模块的职责及 Angular 的接入方式：

| 模块                 | 包名                            | 职责                                                       | Angular 中的位置                                      |
| -------------------- | ------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| **WebMCP Server**    | `@opentiny/next-sdk`            | 在浏览器中运行的 MCP 工具服务器，注册可供 AI 调用的工具    | Angular 主窗口（如 `mcp-servers/index.ts`）           |
| **Page Tool Bridge** | `@opentiny/next-sdk`            | 工具调用时自动导航到目标页面，并通过消息通信执行页面内逻辑 | 同主窗口，与页面内 `registerTool/unregisterTool` 配合 |
| **WebSkills**        | `@opentiny/next-sdk` + 技能文档 | 结构化知识包，让 AI 获得特定领域的角色和文档知识           | Remoter 侧（Vue iframe 内）                           |
| **TinyRemoter**      | `@opentiny/next-remoter`        | Vue 实现的 AI 对话面板组件，集成 LLM + MCP + Skills        | **独立 Vue 应用，通过 iframe 嵌入**                   |

### 为什么 Angular 需要 iframe + createMessageChannelClientTransport？

- **TinyRemoter 是 Vue 组件**，依赖 Vue 运行时，无法在 Angular 中直接使用。
- 采用 **双 HTML 入口** 方案：
  - **主窗口**：Angular 应用（`index.html`），负责路由、MCP Server、页面内工具注册与卸载。
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

完成本文所有步骤后，项目结构如下（以 `doc-ai-angular` 为参考）：

```text
packages/doc-ai-angular/
├── src/
│   ├── main.ts                          # Angular 入口
│   ├── index.html                       # 主应用 HTML
│   ├── app/
│   │   ├── app.config.ts                # 应用配置（含路由）
│   │   ├── app.routes.ts                # ① 路由定义
│   │   ├── app.component.ts             # ② 根组件：setNavigator + 启动 MCP Server
│   │   ├── app.component.html           # ③ 布局：主内容 + iframe 嵌入 remoter
│   │   └── pages/
│   │       ├── comprehensive/          # ⑤ 页面内一体化定义工具（register/unregister）
│   │       └── price-protection/       # ⑤ 页面内一体化定义工具（register/unregister）
│   ├── mcp-servers/
│   │   └── index.ts                     # ④ MCP Server 入口（推荐仅放全局工具）
│   └── proxy.conf.json                  # ⑥ 将 /remoter.html、/remoter 代理到 Remoter 开发服务
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
├── angular.json                         # 配置 proxyConfig
└── package.json                         # dev 脚本同时启动 ng serve 与 remoter
```

---

## 安装依赖

**主应用（Angular）：**

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

与 Vue 版类似，`setNavigator` 告诉 SDK 如何跳转页面。在 Angular 中放在**根组件的 `ngOnInit`** 中，并在此处**一并启动 MCP Server**（见第二步）。

```ts
// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet } from '@angular/router'
import { setNavigator } from '@opentiny/next-sdk'
import { createMcpServer } from '../mcp-servers'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private router = inject(Router)

  async ngOnInit(): Promise<void> {
    // 注册路由导航器，供 Page Tool Bridge 与内置 navigate_to_page 工具使用（仅此一处即可，无需再注入其他导航器）
    setNavigator(async (route) => {
      const navigated = await this.router.navigateByUrl(route)
      if (!navigated) {
        throw new Error(`页面跳转失败：导航至 "${route}" 被取消或拦截`)
      }
    })
    // 启动 MCP Server（创建 MessageChannel 服务端并等待 iframe 连接）
    await createMcpServer()
  }
}
```

> **注意**：`setNavigator` 只需在应用入口（根组件）调用一次，全局生效。该导航函数会被 SDK 用于：① withPageTools 在调用页面工具时自动跳转；② 内置的 `navigate_to_page` 工具（通过 `registerNavigateTool` 注册）在大模型主动请求跳转时使用, 无需再单独注入 Angular 专属的导航器。

---

## 第二步：主窗口布局中嵌入 iframe（Remoter）

主应用布局中预留一块区域，用 **iframe** 加载 Remoter 的入口页面。Remoter 以独立开发服务运行（如 Vite 端口 5179），通过代理将 `/remoter.html` 转发到该服务。

```html
<!-- src/app/app.component.html -->
<div class="app-container">
  <div class="main-content">
    <router-outlet />
  </div>
  <aside class="remoter-sidebar">
    <iframe
      #remoterFrame
      class="remoter-frame"
      src="/remoter.html"
      frameborder="0"
      allow="clipboard-write"
      title="AI 助手"
    ></iframe>
  </aside>
</div>
```

开发环境下，`/remoter.html` 需通过 `proxy.conf.json` 指向 Remoter 开发服务（见下文「Remoter 与代理配置」）。

---

## 第三步：主窗口创建 MCP Server 并监听 iframe（MessageChannel 服务端）

在 Angular 主窗口中创建 WebMCP Server，使用 **createMessageChannelServerTransport** 建立**跨窗口**服务端传输层，供 iframe 内的 TinyRemoter 连接。与 Vue 版不同，这里**不再使用** `createMessageChannelPairTransport()`（同窗口内存对），而是：

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

const rawServer = new WebMcpServer()

/**
 * withPageTools 包装后，支持页面工具桥接能力（导航、握手、消息分发）。
 * 推荐把业务工具放在页面组件内按需 register/unregister。
 */
export const server = withPageTools(rawServer)

/**
 * 初始化 MCP Server：创建 MessageChannel 服务端传输层，
 * 监听 iframe（remoter.html）中 TinyRemoter 的 MCP 连接。
 * 对应 iframe 侧：createMessageChannelClientTransport('local-mcp', window.parent)
 */
export const createMcpServer = async () => {
  // 注册通用页面跳转工具 navigate_to_page（内部使用 setNavigator + 等待页面就绪握手）
  registerNavigateTool(rawServer)
  const serverTransport = createMessageChannelServerTransport('local-mcp')
  await serverTransport.listen()
  await rawServer.connect(serverTransport)
}
```

> **页面跳转工具（navigate_to_page）**：与 Vue 版相同，使用 SDK 提供的 `registerNavigateTool(rawServer)` 即可。工具运行在**主窗口**，会调用你通过 `setNavigator` 注册的导航函数，并等待目标页面完成就绪握手（`page-ready` / 工具目录变更）后再返回，因此 Remoter 在 iframe 内时，路由状态与工具列表的同步不受影响，无需在主窗口再手写一套跳转或 setAngularNavigator。

### 3.1.1 工具定义模式选择（新架构）

推荐优先使用页面内一体化定义：

- 在页面组件生命周期里直接 `server.registerTool` / `server.unregisterTool`；
- 工具随页面挂载/卸载自动增删，Remoter 通过 `listTools` 实时感知变化；
- 与 `registerNavigateTool` 配合后，大模型可先跳转再调用目标页面工具。

分离式定义（`mcp-servers` 声明 + `registerPageTool` 处理）仍兼容，但作为可选方案，不作为本文主路径。

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

/** MessageChannel 客户端：与 Angular 主窗口中的 MCP Server 通信（通过 window.parent） */
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

## 第五步：在 Angular 页面内一体化定义工具（推荐）

推荐模式是把工具声明（参数 schema）和回调（业务逻辑）写在同一个页面组件里。

- 页面进入（`ngOnInit`）：`server.registerTool(...)`
- 页面离开（`ngOnDestroy`）：`server.unregisterTool(...)`

这样工具会随页面生命周期自动增删，Remoter 通过 `listTools` 实时看到最新工具目录。

### 5.1 单工具示例（商品指南）

```ts
// src/app/pages/comprehensive/comprehensive.component.ts（节选）
import { Component, OnInit, OnDestroy } from '@angular/core'
import { z } from '@opentiny/next-sdk'
import { server } from '../../../mcp-servers'

export class ComprehensiveComponent implements OnInit, OnDestroy {
  products: Product[] = productsData as Product[]
  private readonly toolName = 'product-guide'

  ngOnInit(): void {
    server.registerTool(
      this.toolName,
      {
        title: '产品指南',
        description: '根据产品 ID 获取产品详细信息',
        inputSchema: {
          productId: z.string().describe('产品 ID')
        }
      },
      async ({ productId }: { productId: string }) => {
        const product = this.products.find((p) => String(p.id) === productId)
        const text = product ? `产品信息：${JSON.stringify(product, null, 2)}` : `未找到产品 ID 为 ${productId} 的商品`
        return { content: [{ type: 'text', text }] }
      }
    )
  }

  ngOnDestroy(): void {
    server.unregisterTool(this.toolName)
  }
}
```

### 5.2 单页面多工具示例（价保管理）

```ts
// src/app/pages/price-protection/price-protection.component.ts（节选）
import { Component, OnInit, OnDestroy } from '@angular/core'
import { z } from '@opentiny/next-sdk'
import { server } from '../../../mcp-servers'

export class PriceProtectionComponent implements OnInit, OnDestroy {
  records: any[] = []
  private readonly toolNames = ['price-protection-query', 'price-protection-review', 'price-protection-detail']

  ngOnInit(): void {
    server.registerTool(
      'price-protection-query',
      {
        title: '查询价保申请',
        inputSchema: {
          status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional()
        }
      },
      async ({ status }: { status?: string }) => {
        const result = status ? this.records.filter((r) => r.status === status) : this.records
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
        const record = this.records.find((item) => item.id === id)
        if (!record) {
          return { content: [{ type: 'text', text: `未找到 ID 为 ${id} 的申请` }] }
        }
        record.status = action === 'approve' ? 'approved' : 'rejected'
        record.remark = remark ?? (action === 'approve' ? '审核通过' : '不符合条件')
        return { content: [{ type: 'text', text: `申请 ${id} 已${action === 'approve' ? '通过' : '拒绝'}` }] }
      }
    )
  }

  ngOnDestroy(): void {
    this.toolNames.forEach((name) => server.unregisterTool(name))
  }
}
```

> **处理器编写规范**：
>
> - 回调参数类型由工具 `inputSchema` 决定。
> - 返回格式统一为：`{ content: Array<{ type: 'text', text: string }> }`。
> - 组件销毁时必须 `unregisterTool`，避免旧工具残留在目录中。

---

## 第六步：Remoter 子工程与代理配置

### 6.1 Remoter 为独立 Vue 工程

- 使用 Vite 单独启动（如端口 5179），`base: '/remoter/'`，以便主应用通过路径前缀代理。
- 入口：`remoter/index.html` → `remoter/src/main.ts` → 挂载 `App.vue`。

### 6.2 主应用代理（Angular）

开发时主应用（如 `ng serve`）需把 Remoter 的 HTML 和静态资源代理到 Vite 开发服务：

```json
// proxy.conf.json
{
  "/remoter.html": {
    "target": "http://localhost:5179",
    "pathRewrite": { "^/remoter.html": "/remoter/" },
    "secure": false,
    "changeOrigin": true
  },
  "/remoter": {
    "target": "http://localhost:5179",
    "secure": false,
    "changeOrigin": true
  }
}
```

在 `angular.json` 的 `serve.options` 中配置：

```json
"proxyConfig": "proxy.conf.json"
```

### 6.3 同时启动主应用与 Remoter

```bash
# 同时启动 Angular 与 Remoter（concurrently）
pnpm dev
# 或
pnpm run dev
```

`package.json` 示例：

```json
{
  "scripts": {
    "dev": "concurrently -n ng,remoter \"ng serve\" \"pnpm -C remoter dev\"",
    "dev:ng": "ng serve",
    "dev:remoter": "pnpm -C remoter dev"
  }
}
```

访问主应用地址（如 <http://localhost:4200>），页面中的 iframe 会加载 `/remoter.html`，经代理得到 Remoter 页面；Remoter 内通过 `createMessageChannelClientTransport('local-mcp', window.parent)` 与主窗口 MCP Server 建立连接。

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
LLM 先调用 navigate_to_page，参数 { path: "/comprehensive" }
    ↓
TinyRemoter 的 MCP Client 通过 createMessageChannelClientTransport
    向 window.parent（主窗口）发送跳转请求
    ↓
主窗口的 MCP Server（createMessageChannelServerTransport）收到请求，
    调用 setNavigator 跳转到 /comprehensive
    ↓
页面组件 ngOnInit 执行 registerTool，工具目录更新并完成 page-ready 握手
    ↓
LLM 重新读取 listTools，发现 product-guide 工具已激活
    ↓
TinyRemoter 再次发起工具调用
    ↓
SDK 在主窗口内 postMessage 发送
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

| 项目                  | Vue 版本                                                                     | Angular 版本                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| TinyRemoter 使用方式  | 直接在主应用内引用 Vue 组件                                                  | **iframe 嵌入独立 Vue 应用**，主应用不直接引用 Remoter                                                                                       |
| MCP 连接方式          | `createMessageChannelPairTransport()` 同窗口内存对                           | **主窗口** `createMessageChannelServerTransport('local-mcp')` + **iframe** `createMessageChannelClientTransport('local-mcp', window.parent)` |
| setNavigator          | 在 `main.ts` 中 `setNavigator(router.push)`                                  | 在根组件 `ngOnInit` 中 `setNavigator(router.navigateByUrl)`                                                                                  |
| MCP Server 与工具注册 | 在 App.vue 或独立模块，同窗口                                                | 在 `mcp-servers/index.ts`，**主窗口**                                                                                                        |
| 页面工具注册（推荐）  | `onMounted` + `server.registerTool`，`onUnmounted` + `server.unregisterTool` | `ngOnInit` + `server.registerTool`，`ngOnDestroy` + `server.unregisterTool`                                                                  |
| WebSkills 位置        | 主应用 `src/skills/`                                                         | **Remoter 工程** `remoter/src/skills/`（Vue 侧）                                                                                             |
| 开发与代理            | 单应用，无需代理                                                             | **双入口**：主应用 + Remoter 子包，主应用代理 `/remoter.html`、`/remoter` 到 Remoter 开发服务                                                |

---

## 常见问题

### 工具调用超时？

- 确认 **Remoter iframe 已加载**，且主窗口已执行 `createMcpServer()`（含 `serverTransport.listen()`）。
- **endpoint 一致**：主窗口 `createMessageChannelServerTransport('local-mcp')` 与 iframe 内 `createMessageChannelClientTransport('local-mcp', window.parent)` 的 `'local-mcp'` 必须相同。
- 页面是否在 `ngOnInit` 中调用了 `server.registerTool`，并在 `ngOnDestroy` 中调用了 `server.unregisterTool`。
- 若工具依赖特定页面状态，先通过 `navigate_to_page` 跳转到对应路由，再调用页面工具。

### iframe 空白或无法加载 Remoter？

- 开发时是否**同时启动了** Angular 主应用 和 Remoter（`pnpm dev`），且 `proxy.conf.json` 中 target 端口（如 5179）与 Remoter 的 Vite 端口一致。
- Remoter 的 `vite.config.ts` 中 `base: '/remoter/'` 与代理路径重写是否匹配（如 `/remoter.html` → `/remoter/`）。

### 工具名大小写

`server.registerTool('product-guide', ...)` 中的工具名是全局唯一标识，调用时必须**完全一致**（大小写敏感）。

### 多个工具共用一个路由

与 Vue 版相同：在同一页面中多次 `server.registerTool` 即可。建议维护 `toolNames` 数组，并在 `ngOnDestroy` 中批量 `unregisterTool`。

### 如何让 AI 先跳转再使用页面工具？

与 Vue 版相同：在 `createMcpServer` 中调用 `registerNavigateTool(rawServer)` 即可注册内置的 `navigate_to_page` 工具。工具运行在主窗口，会使用 `setNavigator` 执行跳转并等待 page-ready，Remoter 在 iframe 内时也会通过既有桥接协议收到路由状态更新，无需主窗口再手写 setAngularNavigator 或等待逻辑。

### 如何在不跳转的情况下使用工具？

若工具不依赖页面状态，在 `mcp-servers` 中直接传回调函数作为第三个参数，例如：

```ts
server.registerTool('get-time', { title: '获取当前时间', description: '...' }, async () => {
  return { content: [{ type: 'text', text: new Date().toLocaleString() }] }
})
```

### 还可以用分离式定义吗？

可以。分离式（`mcp-servers` + `registerPageTool`）仍兼容，但不作为默认推荐路径。本文推荐优先采用页面内一体化定义，降低接入和维护复杂度。

---

## 参考

- 完整示例工程：**packages/doc-ai-angular**（含主应用、remoter 子包、代理与双入口启动）。
- Vue 同架构最佳实践：**docs/guide/vue-webmcp-best-practice.md**。
- Remoter 为 Vue 组件，Angular 侧仅通过 **iframe + createMessageChannelClientTransport** 与其通信，MCP 与 Page Tool Bridge 逻辑均在 Angular 主窗口完成。
