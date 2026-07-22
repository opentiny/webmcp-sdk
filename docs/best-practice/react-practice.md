# React 工程接入 WebMCP + WebSkills 最佳实践

本文根据最新的 WebMCP 标准与 `doc-ai-react` 示例项目，带你一步步把普通 React 工程升级为 AI 驱动的智能应用。

> **核心变化**：我们现在**统一使用浏览器原生的 `modelContext` 接口**。通过调用 SDK 提供的初始化函数，低版本浏览器也能获得完全一致的 Polyfill 支持，实现 AI 工具的自动注册与路由同步。
> **示例工程仓库**：[`packages/doc-ai-react`](https://github.com/opentiny/webmcp-sdk/tree/dev/packages/doc-ai-react)

它的核心概念与适配流程，与 `Vue` 工程最佳实践是一致的，可以适当结合着一起看。本文重点描述关键步骤和与 Vue 工程差异的地方。

---

## 核心概念

在 Web 端集成 MCP 时，最重要的资产是 **"模型上下文 (Model Context)"**。

| 模块                 | 职责                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| **Model Context**    | 浏览器原生接口，用于注册工具。对话组件（如 TinyRemoter）会自动从中读取。 |
| **navigate_to_page（业务模版）** | 用户自配路由跳转；跳转后调用 SDK `waitForRouteTools` |
| **WebSkills**        | 让 AI 获得业务知识（如产品手册、SOP）的 Markdown 文档包。                |
| **WebAgent**         | 远程代理模块，支持手机或异地 AI 通过识别码控制当前页面工具。             |

与 Vue 版相比，React 版的核心差异在于 **双工程架构**：

1. **React 主应用**：负责路由、MCP Server、业务页面与工具定义。
2. **Vue Remoter 子工程**：独立运行在 iframe 中的 Vue 迷你应用，仅渲染 TinyRemoter UI，通过 `window.parent.document.modelContext` 共享主窗口的模型上下文。

四模块职责在双工程中的分布如下：

| 模块               | 所在工程         | 说明                                                         |
| ------------------ | ---------------- | ------------------------------------------------------------ |
| **Model Context**  | React 主应用     | 由 `initializeBuiltinWebMCP()` 激活，挂在 `document.modelContext` 上 |
| **navigate_to_page** | React 主应用     | 自配导航 + `routeToolsMap`；跳转后 `waitForRouteTools`；工具随路由 mount/unmount |
| **WebSkills**      | Vue Remoter 子工程 | Skills 目录保留在 Vue 侧，通过 `import.meta.glob` 加载       |
| **WebAgent**       | React 主应用     | `useWebAgentServer` 建立远程连接，sessionId 传给 Remoter 展示 |

---

## 为什么 React 需要特殊处理

Vue 版文档中，TinyRemoter 直接作为 Vue 组件嵌入 `App.vue` 即可。但 React 工程面临一个核心问题：

- **TinyRemoter 是 Vue 组件**，依赖 Vue 运行时，无法在 React 中直接 `import` 使用。
- 如果强行在 React 工程中混用 Vue 运行时，会导致两套响应式系统冲突、构建配置复杂化。

因此采用 **双 HTML 入口 + iframe 隔离** 方案：

- **主窗口（React 应用 `index.html`）**：负责路由、MCP Server、业务逻辑与工具定义。
- **子窗口（Vue 迷你应用 `remoter/index.html`）**：仅渲染 TinyRemoter UI，运行在 iframe 中。

两个工程通过 Vite 代理打通同源，iframe 内的 Remoter 通过 `window.parent.document.modelContext` 直接读取主窗口的模型上下文，实现 AI 对话 UI 与 MCP 工具的无缝协作。

---

## 推荐目录结构

完成本文所有步骤后，项目结构如下（以 `doc-ai-react` 为参考）：

```text
packages/doc-ai-react/
├── index.html                       # 主应用 HTML（含 iframe 布局）
├── vite.config.ts                   # 主应用 Vite 配置（含 /remoter 代理）
├── package.json                     # dev 脚本同时启动主应用与 remoter
├── src/
│   ├── main.tsx                     # React 入口：激活 WebMCP + createMcpServer
│   ├── App.tsx                      # 应用根组件：挂载 RouterProvider
│   ├── AppLayout.tsx                # 布局组件：侧边栏 + <Outlet/> 路由出口
│   ├── router.tsx                   # React Router v7 路由配置（lazy 懒加载）
│   ├── const.ts                     # 常量定义（如 AGENT_ROOT）
│   ├── App.css                      # 全局样式
│   ├── index.css                    # 基础重置样式
│   ├── components/                  # 业务页面组件
│   │   ├── HomePage.tsx             # 概览大盘
│   │   ├── InventoryPage.tsx       # 库存管理（方案A：页面内按需注册）
│   │   ├── InventoryModal.tsx       # 入库弹窗（Promise 化 AI 联动）
│   │   ├── PriceProtectionPage.tsx  # 价保监控（多工具一体化注册）
│   │   ├── PriceProtectionModal.tsx # 价保弹窗（Promise 化 AI 联动）
│   │   ├── OrdersPage.tsx           # 订单管理
│   │   ├── SalesPage.tsx            # 商品销售记录
│   │   ├── FinancePage.tsx          # 财务管理（页面内 registerTool）
│   │   └── NotFoundPage.tsx         # 404 页面
│   ├── mcp-servers/                 # MCP 工具定义（主窗口）
│   │   ├── index.ts                 # createMcpServer：注册自配 navigate_to_page
│   │   ├── navigate-tool.ts         # 【可复制】routeToolsMap + waitForRouteTools
│   │   └── useWebAgentServer.ts     # 远程遥控初始化逻辑
│   └── mock/
│       └── index.ts                 # 模拟业务数据
│
└── remoter/                         # 独立 Vue 子工程（iframe 内容）
    ├── package.json
    ├── vite.config.ts               # base: '/remoter/'，端口 5179
    ├── index.html                   # Remoter 入口 HTML
    └── src/
        ├── main.ts                  # Vue 挂载到 #remoter-app
        ├── App.vue                  # TinyRemoter + systemPrompt + skills
        └── skills/                  # WebSkills（保留在 Vue 侧）
            ├── inventory/
            │   └── SKILL.md         # 库存业务引导词
            ├── orders/
            │   └── SKILL.md
            ├── price-protection/
            │   └── SKILL.md
            └── sales/
                └── SKILL.md
```

---

## 安装依赖

**主应用（React）：**

```bash
pnpm add @opentiny/next-sdk react-router-dom
```

**Remoter 子包（Vue）：**

```bash
pnpm add @opentiny/next-sdk @opentiny/next-remoter vue
```

---

## 第一步：环境初始化 (main.tsx)

SDK **不再提供** `setNavigator`。激活 Builtin WebMCP 后，通过 `createMcpServer()` 注册自配 `navigate_to_page`。

```tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import './index.css'
import App from './App.tsx'
import { router } from './router.tsx'
import { createMcpServer } from './mcp-servers/index.ts'

initializeBuiltinWebMCP()
await createMcpServer()
createRoot(document.getElementById('root')!).render(<App />)
```

> **与 Vue 版的差异**：导航函数传给模版为 `(path) => router.navigate(path)`；业务工具在页面 `useEffect` 中注册。

---



## 自配路由跳转工具（可复制模版）

业务侧自行 `registerTool` 导航工具，跳转后调用 SDK `waitForRouteTools(path, routeToolsMap)` 做握手。

完整示例：[`packages/doc-ai-react/src/mcp-servers/navigate-tool.ts`](https://github.com/opentiny/next-sdk/blob/dev/packages/doc-ai-react/src/mcp-servers/navigate-tool.ts)。

```ts
import { waitForRouteTools, type RouteToolsMap } from '@opentiny/next-sdk'

export const routeToolsMap: RouteToolsMap = {
  '/orders': ['order_query', 'order_detail'],
  '/finance': ['finance_summary_query']
  // ...
}

export function registerNavigateToPageTool(navigate: (path: string) => void | Promise<void>): void {
  const modelContext = (document as any).modelContext
  modelContext.registerTool({
    name: 'navigate_to_page',
    // ... title / description / inputSchema
    execute: async ({ path }: { path: string }) => {
      const normalized = path.replace(/\/+$/, '') || '/'
      await navigate(normalized)
      await waitForRouteTools(normalized, routeToolsMap, { timeoutMs: 5000, pollMs: 100 })
      return { content: [{ type: 'text', text: `已跳转至页面：${normalized}` }] }
    }
  })
}
```

```ts
// src/mcp-servers/index.ts
import { registerNavigateToPageTool } from './navigate-tool'
import { router } from '../router'

export const createMcpServer = async () => {
  registerNavigateToPageTool((path) => router.navigate(path))
}
```

约定：`routeToolsMap` 的工具名须与页面 `registerTool` 的 `name` 一致；可选 `timeoutMs` / `pollMs`。

---## 第二步：路由配置

React 工程使用 **React Router v7** 的 `createBrowserRouter` 进行路由管理。确保每个有页面工具的页面都有对应路由，并与 `navigate_to_page` 的目标路径保持一致。

### 1. 路由定义 (router.tsx)

使用 `lazy` 进行懒加载，实现页面级代码分割：

```tsx
// src/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import AppLayout from './AppLayout'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        lazy: () => import('./components/HomePage')
      },
      {
        path: '/inventory',
        lazy: () => import('./components/InventoryPage')
      },
      {
        path: '/price-protection',
        lazy: () => import('./components/PriceProtectionPage')
      },
      {
        path: '/orders',
        lazy: () => import('./components/OrdersPage')
      },
      {
        path: '/sales',
        lazy: () => import('./components/SalesPage')
      },
      {
        path: '/finance',
        lazy: () => import('./components/FinancePage')
      },
      {
        path: '*',
        lazy: () => import('./components/NotFoundPage')
      }
    ]
  }
])
```

### 2. 应用根组件 (App.tsx)

`App.tsx` 仅需挂载 `RouterProvider`，保持极简：

```tsx
// src/App.tsx
import { RouterProvider } from 'react-router-dom'
import { router } from './router.tsx'

function App() {
  return <RouterProvider router={router} />
}

export default App
```

### 3. 布局组件 (AppLayout.tsx)

`AppLayout` 负责系统框架布局：顶部导航栏 + 左侧菜单 + 右侧 `<Outlet/>` 路由出口。每个 lazy 加载的页面组件需导出 `Component` 函数以适配 React Router v7 的 lazy 约定。

```tsx
// src/AppLayout.tsx
import { Outlet, Link } from 'react-router-dom'
import './App.css'

function AppLayout() {
  return (
    <div className="app-container">
      <div className="app-left">
        <header className="app-header">
          <div className="logo">
            <h1>电商智能管理系统</h1>
          </div>
          <div className="header-actions">
            <span className="user-greeting">欢迎，管理员</span>
          </div>
        </header>

        <div className="app-body">
          <aside className="app-sidebar">
            <nav className="nav-menu">
              <Link to="/" className="nav-item">概览大盘</Link>
              <Link to="/inventory" className="nav-item">库存管理</Link>
              <Link to="/price-protection" className="nav-item">价保监控</Link>
              <Link to="/orders" className="nav-item">订单管理</Link>
              <Link to="/sales" className="nav-item">商品销售记录</Link>
              <Link to="/finance" className="nav-item">财务管理</Link>
            </nav>
          </aside>

          <main className="app-main">
            <div className="router-wrapper">
              {/* 路由内容将通过 Outlet 渲染 */}
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
```

---

## 第三步：主窗口布局中嵌入 iframe（Remoter）

主应用布局中预留一块区域，用 **iframe** 加载 Remoter 的入口页面。Remoter 以独立开发服务运行（如 Vite 端口 5179），为防止跨域，通过代理将 `/remoter` 转发到该服务。

### 1. 主应用 HTML 入口 (index.html)

```html
<!-- index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>电商智能管理系统</title>
  </head>
  <body>
    <!-- 左右分栏：左侧 70% 主内容，右侧 30% AI 助手 -->
    <div class="app-container" id="appContainer">
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

    <!-- 监听 Remoter 收起/展开，同步主窗口布局 -->
    <script>
      window.addEventListener('message', function (e) {
        if (e.origin !== window.location.origin) return
        if (e.data && e.data.type === 'remoter-toggle') {
          var container = document.getElementById('appContainer')
          if (!container) return
          if (e.data.show) {
            container.classList.remove('remoter-collapsed')
          } else {
            container.classList.add('remoter-collapsed')
          }
        }
      })
    </script>

    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

> **关键点**：`postMessage` 通信让 Remoter iframe 收起/展开时同步通知主窗口调整布局宽度。

### 2. 主应用 Vite 配置 (vite.config.ts)

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/remoter': {
        target: 'http://localhost:5179',
        changeOrigin: true,
      },
    },
  },
})
```

---

## 第四步：主窗口注册自配导航工具

在 `main.tsx` 中于 `initializeBuiltinWebMCP()` 之后调用 `createMcpServer()`：

```ts
// src/mcp-servers/index.ts
import { registerNavigateToPageTool } from './navigate-tool'
import { router } from '../router'

export const createMcpServer = async () => {
  registerNavigateToPageTool((path) => router.navigate(path))
}
```

完整模版见上文「自配路由跳转工具」及示例 [`navigate-tool.ts`](https://github.com/opentiny/next-sdk/blob/dev/packages/doc-ai-react/src/mcp-servers/navigate-tool.ts)。

---

## 第五步：在页面组件中定义工具

React 工程中注册工具的方式与 Vue 工程一致，借助原生 WebMCP API，不依赖框架。用 `useEffect` 模拟 `onMounted` / `onUnmounted`。

**强烈建议**在页面组件内部按需注册工具：

1. **减少幻觉**：工具只在对应业务页挂载时存在。
2. **降低负载**：工具列表随路由变化自动增减。
3. **配合 Skills / navigate_to_page**：先跳转到目标页并握手，再调用该页工具。

```tsx
// src/components/InventoryPage.tsx（核心逻辑节选）
import { useEffect, useRef, useState } from 'react'
import type { ModelContext } from '@mcp-b/webmcp-types'
import InventoryModal, { type InventoryModalRef, type InventoryModalProps } from './InventoryModal'

export function Component() {
  const modalRef = useRef<InventoryModalRef>(null)
  const [inventory, setInventory] = useState<InventoryItem[]>([])

  useEffect(() => {
    const ADD_INVENTORY_TOOL = 'add_inventory'
    const controller = new AbortController()
    // 兼容写法：同时兼容 document 和 navigator
    const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext

    if (modelContext?.registerTool) {
      modelContext.registerTool(
        {
          name: ADD_INVENTORY_TOOL,
          description: '【入库管理工具】帮助电商管理员将采购的商品新增入库存系统中',
          inputSchema: {
            type: 'object',
            properties: {
              productName: { type: 'string', description: '商品名称或型号，如：iPhone 15 Pro Max' },
              quantity: { type: 'number', description: '要入库的数量，必须大于0' },
              warehouse: { type: 'string', description: '入库存放的仓库名称，如：北京一号仓' }
            },
            required: ['productName', 'quantity', 'warehouse']
          },
          execute: async (params: InventoryModalProps) => {
            if (!modalRef.current) {
              return { content: [{ type: 'text', text: '错误：入库弹窗未加载，当前页面可能已被销毁。' }] }
            }
            // AI 发起 → 弹窗等待人工确认 → 返回结果
            const result = await modalRef.current.openModal(params)
            return { content: [{ type: 'text', text: result }] }
          }
        },
        { signal: controller.signal }
      )
    }

    return () => {
      // 组件卸载时注销工具，防止工具泄漏到其他页面
      controller.abort()
    }
  }, [])

  return (
    <div className="inventory-view">
      {/* 表格与 UI 省略 */}
      <InventoryModal ref={modalRef} />
    </div>
  )
}

export default Component
```

> **与 Vue 版的差异**：Vue 使用 `onMounted` / `onUnmounted`；React 使用 `useEffect` 的 setup 与 cleanup。React Router v7 的 lazy 路由要求页面组件导出 `Component`。财务等业务工具同样在页面内 `registerTool`，工具名写入 `routeToolsMap`。

---

## AI 与 UI 深度联动

在电商场景中，AI 调用入库工具时不应该直接执行写入，而应该弹出确认弹窗让人工核对后再执行。这种 **"AI 发起 → 人工确认 → 执行"** 的模式通过 Promise 化弹窗实现。

### Promise 化弹窗模式 (InventoryModal.tsx)

核心思路：使用 `forwardRef` + `useImperativeHandle` 暴露 `openModal` 方法，该方法返回一个 `Promise<string>`。AI 工具的 `execute` 函数 `await` 这个 Promise，弹窗关闭时 `resolve` 结果。

```tsx
// src/components/InventoryModal.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react'
import { addInventory } from '../mock'

export interface InventoryModalProps {
  productName?: string
  quantity?: number
  warehouse?: string
}

export interface InventoryModalRef {
  openModal: (params: InventoryModalProps) => Promise<string>
}

const InventoryModal = forwardRef<InventoryModalRef, {}>((_props, ref) => {
  const [visible, setVisible] = useState(false)
  const [formData, setFormData] = useState({
    productName: '',
    quantity: 1,
    warehouse: '北京一号仓'
  })

  // 保存当前 Promise 的 resolve 函数
  const currentResolve = useRef<((result: string) => void) | null>(null)

  const openModal = (params: InventoryModalProps) => {
    // 如果已有未完成的操作，先取消前置操作
    if (currentResolve.current) {
      currentResolve.current('❌ 用户发起了新的操作，前置入库已取消。')
    }
    // 用 AI 提供的参数预填表单
    setFormData({
      productName: params.productName || '',
      quantity: params.quantity || 1,
      warehouse: params.warehouse || '北京一号仓'
    })
    setVisible(true)

    // 返回 Promise，AI 的 execute 会 await 此 Promise
    return new Promise<string>((resolve) => {
      currentResolve.current = resolve
    })
  }

  useImperativeHandle(ref, () => ({ openModal }))

  // 组件卸载时清理 pending Promise，防止 AI execute 永久阻塞
  useEffect(() => {
    return () => {
      if (currentResolve.current) {
        currentResolve.current('❌ 页面已卸载，入库操作已取消。')
        currentResolve.current = null
      }
    }
  }, [])

  const handleConfirm = () => {
    if (!formData.productName) {
      alert('商品名称不能为空')
      return
    }
    // 校验数量为正整数，防止 parseInt('−2') 等异常值写入库存
    const qty = Number(formData.quantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      alert('入库数量必须是大于 0 的整数')
      return
    }

    // 执行实际业务逻辑
    addInventory({
      productName: formData.productName,
      sku: `SKU-AUTO-${Math.floor(Math.random() * 10000)}`,
      quantity: qty,
      warehouse: formData.warehouse
    })

    // resolve 结果给 AI，AI 会将此文本返回给用户
    if (currentResolve.current) {
      currentResolve.current(
        `📦 成功！已将 ${qty} 件 ${formData.productName} 入库到 ${formData.warehouse}。`
      )
    }

    setVisible(false)
    currentResolve.current = null
  }

  const handleCancel = () => {
    if (currentResolve.current) {
      currentResolve.current('❌ 用户取消了入库操作。')
    }
    setVisible(false)
    currentResolve.current = null
  }

  if (!visible) return null

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📦 新增入库单核对</h3>
        </div>
        <div className="modal-body">
          <div className="alert-info">
            <span className="icon">🤖</span>
            <div className="text">
              <strong>AI 业务助手</strong> 已为您提取了入库请求。请核实下方商品数量及存放仓库，确认无误后点击执行。
            </div>
          </div>

          <div className="form-container">
            <div className="form-item">
              <label>商品名称</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="例如：iPhone 15 Pro Max"
              />
            </div>
            <div className="form-item">
              <label>入库数量</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value)
                  setFormData({ ...formData, quantity: Number.isInteger(v) && v > 0 ? v : 1 })
                }}
              />
            </div>
            <div className="form-item">
              <label>存放仓库</label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}>
                <option value="北京一号仓">北京一号仓</option>
                <option value="上海二号仓">上海二号仓</option>
                <option value="广州中心仓">广州中心仓</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleCancel}>取消本次入库</button>
          <button className="btn-confirm" onClick={handleConfirm}>确认并执行入库</button>
        </div>
      </div>
    </div>
  )
})

export default InventoryModal
```

> **工作流程**：
> 1. AI 调用 `add_inventory` 工具，传入 `productName`、`quantity`、`warehouse`
> 2. 工具的 `execute` 调用 `modalRef.current.openModal(params)` 并 `await`
> 3. 弹窗弹出，表单已用 AI 参数预填，等待人工核对
> 4. 用户点击"确认" → `resolve("成功信息")` → AI 收到结果并回复用户
> 5. 用户点击"取消" → `resolve("取消信息")` → AI 告知用户操作已取消

---

## 第六步：Remoter 子工程完整接入

Remoter 是一个独立的 Vue 子工程，运行在 iframe 中。它负责加载 TinyRemoter 对话组件、WebSkills 知识库，并通过 `window.parent.document.modelContext` 共享主窗口的模型上下文。

### 1. 入口 HTML (remoter/index.html)

```html
<!-- remoter/index.html -->
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="data:," />
    <title>TinyRemoter - iframe host</title>
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
    </style>
  </head>
  <body>
    <div id="remoter-app"></div>
    <script type="module" src="./src/main.ts"></script>
  </body>
</html>
```

### 2. Vue 入口 (remoter/src/main.ts)

```ts
// remoter/src/main.ts
import { createApp } from 'vue'
import App from './App.vue'

// 创建并挂载 Vue 应用（仅包含 TinyRemoter），用于 iframe 内渲染
const app = createApp(App)
app.mount('#remoter-app')
```

### 3. Vite 配置 (remoter/vite.config.ts)

```ts
// remoter/vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { TinyVueSingleResolver } from '@opentiny/unplugin-tiny-vue'
import svgLoader from 'vite-svg-loader'
import { VantResolver } from '@vant/auto-import-resolver'
import importPlugin from '@opentiny/vue-vite-import'
import { resolve } from 'path'

export default defineConfig({
  root: __dirname,
  base: '/remoter/',
  define: {
    'process.env.TINY_MODE': JSON.stringify('pc')
  },
  plugins: [
    vue(),
    Components({ resolvers: [TinyVueSingleResolver, VantResolver()] }),
    AutoImport({ resolvers: [TinyVueSingleResolver, VantResolver()] }),
    svgLoader({ defaultImport: 'component', svgo: false }),
    importPlugin(
      {
        options: [
          { libraryName: '@opentiny/vue', split: '-' },
          {
            libraryName: '@opentiny/vue-icon',
            customName: (name: string) => `@opentiny/vue-icon/lib/${name.replace(/^icon-/, '')}.js`
          }
        ],
        mode: 'pc',
        exclude: [/test\.vue/]
      },
      'pc'
    )
  ],
  server: {
    port: 5179,
    strictPort: true,
    origin: 'http://localhost:5179'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  }
})
```

> **关键配置**：`base: '/remoter/'` 确保资源路径正确；`port: 5179` + `strictPort: true` 固定端口，与主应用代理配置对应。

### 4. Remoter 根组件 (remoter/src/App.vue)

这是 Remoter 子工程的核心文件。它完成以下任务：
- 挂载 TinyRemoter 组件
- 通过 `window.parent.document.modelContext` 共享主窗口的模型上下文
- 加载 Skills 知识库
- 设置 `systemPrompt` 约束 AI 行为
- 收起/展开时通过 `postMessage` 通知父窗口

```vue
<!-- remoter/src/App.vue -->
<template>
  <tiny-remoter
    v-model:show="show"
    :fullscreen="true"
    :menuItems="menuItems"
    :mcpServers="mcpServers"
    :skills="skillMdModules"
    :systemPrompt="systemPrompt"
    :promptItems="ecommercePromptItems"
    :pillItems="ecommercePillItems"
  />
</template>

<script setup lang="ts">
import { TinyRemoter } from '@opentiny/next-remoter'
import type { McpServerConfig, MenuItemConfig } from '@opentiny/next-sdk'
import type { ModelContext } from '@mcp-b/webmcp-types'
import '@opentiny/next-remoter/dist/style.css'
import { ref, watch, onMounted, onUnmounted, h } from 'vue'

const show = ref(true)

// 收起/展开时通知父窗口同步布局（使用精确 origin 而非 '*'）
watch(show, (val) => {
  window.parent.postMessage({ type: 'remoter-toggle', show: val }, window.location.origin)
})

const menuItems = ref<MenuItemConfig[]>([])

/** 加载 skills 目录下所有 markdown（技能定义），限定 .md 避免误加载非技能文件 */
const skillMdModules = import.meta.glob('./skills/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

// 💡 关键：通过 window.parent.document 共享主窗口的 modelContext
// 由于 iframe 加载早于 main.tsx 的 initializeBuiltinWebMCP()，
// 使用 parent-ready 握手确保父窗口 modelContext 就绪后再读取
const mcpServers = ref<Record<string, McpServerConfig>>({})

onMounted(() => {
  const initMcpServers = () => {
    const doc = window.parent.document as Document & { modelContext?: ModelContext }
    if (doc.modelContext) {
      mcpServers.value = {
        'mcp-server-builtin-webmcp': {
          type: 'builtin' as const,
          client: doc.modelContext
        }
      }
    }
  }

  // 先尝试一次，若未就绪则等待 parent-ready 消息
  initMcpServers()
  if (Object.keys(mcpServers.value).length === 0) {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'parent-ready') {
        window.removeEventListener('message', handler)
        initMcpServers()
      }
    }
    window.addEventListener('message', handler)
  }
})

// 电商管理平台：欢迎区建议卡片
const ecommercePromptItems = [
  {
    label: '订单与物流',
    description: '需要查订单状态、物流信息，还是根据客户姓名找订单？',
    icon: h('span', { style: { fontSize: '18px' } }, '📦'),
    badge: 'NEW'
  },
  {
    label: '价保与售后',
    description: '要创建价保申请、补差价，还是查看价保单审核状态？',
    icon: h('span', { style: { fontSize: '18px' } }, '🛡️')
  },
  {
    label: '库存与销售',
    description: '需要商品入库、查销售趋势，还是看财务对账？',
    icon: h('span', { style: { fontSize: '18px' } }, '📊')
  }
]

// 电商管理平台：输入框上方快捷操作按钮
const ecommercePillItems = [
  {
    id: 'orders',
    text: '订单物流',
    menus: [
      { id: 0, text: '查订单状态', inputMessage: '帮我查一下订单 ORD-5X9A2B 的当前状态和物流信息。' },
      { id: 1, text: '按客户查单', inputMessage: '请根据客户姓名「张三」查询他的订单列表。' }
    ]
  },
  {
    id: 'price-protection',
    text: '价保售后',
    menus: [
      {
        id: 0,
        text: '创建价保',
        inputMessage: '帮我给用户王五创建一个价保申请单，金额 1000 元，原因为百亿补贴。'
      },
      { id: 1, text: '查价保单', inputMessage: '帮我查看当前待审核的价保申请列表。' }
    ]
  },
  {
    id: 'inventory-sales',
    text: '库存与销售',
    menus: [
      { id: 0, text: '商品入库', inputMessage: '请把 200 台 MacBook Pro 入库到上海二号仓。' },
      { id: 1, text: '销售趋势', inputMessage: '帮我看看最近 30 天的商品销售趋势。' },
      { id: 2, text: '财务对账', inputMessage: '打开财务管理看板，看一下本月支出和可用余额。' }
    ]
  }
]

// 💡 systemPrompt 约束 AI 行为：告知 AI 工具随路由动态加载
const systemPrompt = `你是「电商智能管理系统」的内置助理，必须严格遵守以下工具调用规则：

1）这是一个采用 WebMCP 架构的项目：
- 工具是随页面路由「动态加载和卸载」的。这意味着如果你在当前工具列表中没有看到某个功能（例如库存管理工具 add_inventory），说明你当前可能不在对应的页面。
- 当你需要调用某个功能但发现对应工具缺失时，你应该先使用 navigate_to_page 工具跳转到对应的路由（例如：库存 -> /inventory，订单 -> /orders，价保 -> /price-protection，财务 -> /finance），跳转成功后，对应的工具会自动出现在你的工具列表中。

2）技能文档优先：
- 在调用任何业务工具（如下单、价保、库存等）之前，必须先调用 get_skill_content 工具读取对应 skill 技能文档。
- 只有在「确认已经阅读并理解技能文档」之后，才允许继续调用后续业务工具。

3）只调用已提供的工具，禁止"猜名字"：
- 你只能从当前上下文中「明确列出的 MCP 工具列表」中选择工具名称，必须一字不差地使用列表里的名称。
- 绝对禁止凭空发明或猜测新的工具名。
- 如果在跳转到对应路由后仍找不到该工具，请告知用户该功能可能尚未实现。

4）处理"工具不存在"错误的方式：
- 如果工具调用返回「工具不存在」等类似错误，且你已确认路径正确，请向用户清晰说明情况，并建议由开发者维护。

请始终记住：你是一个具备「导航意识」的 AI 助理，通过页面跳转来获取环境所需的 MCP 工具能力。`
</script>
```

> **与 Vue 版的差异**：Vue 版在 `App.vue` 中直接使用 `document.modelContext`；React 版的 Remoter 在 iframe 中运行，必须使用 `window.parent.document.modelContext` 获取父窗口的模型上下文。

---

## 第七步：WebAgent 远程遥控

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

// 从本地存储读取，确保刷新页面后识别码保持不变
const cachedSessionId: string | undefined = localStorage.getItem(SESSION_ID_KEY) ?? undefined

export const useWebAgentServer = async () => {
  const { sessionId, transport } = await client.connect({
    sessionId: cachedSessionId,
    agent: true,    // 开启代理模式
    builtin: true,  // 代理内置的 WebMCP 工具
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })

  transport.onclose = () => {
    console.log('WebMcpClient closed')
  }

  transport.onerror = (error) => {
    console.error('WebMcpClient error:', error)
  }

  // 持久化到 localStorage，刷新页面后可复用
  if (sessionId) {
    localStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return { sessionId }
}
```

### 2. 在 Remoter 中展示遥控信息

在 React 主应用中初始化远程服务后，将获取到的 `sessionId` 通过 `postMessage` 或共享存储传递给 Remoter iframe，在 Remoter 的 `menuItems` 中展示遥控信息。

在主应用的 `main.tsx` 中调用（见第一步第 6 行）：

```ts
// src/mcp-servers/index.ts（已导出 useWebAgentServer）
import { useWebAgentServer } from './useWebAgentServer'
import { AGENT_ROOT } from '../const'

// 在主应用初始化时调用，获取 sessionId 后传给 Remoter
export async function initWebAgent() {
  try {
    const { sessionId } = await useWebAgentServer()
    if (sessionId) {
      const remoteUrl = `${AGENT_ROOT}/mcp?sessionId=${sessionId}`
      const payload = {
        type: 'web-agent-info',
        menuItems: [
          {
            action: 'remote-url',
            text: '遥控器链接',
            desc: remoteUrl,
            active: true,
            showCopyIcon: true
          },
          {
            action: 'remote-control',
            text: '识别码',
            desc: sessionId.slice(-6),  // 展示后 6 位作为识别码
            know: true,
            showCopyIcon: true
          }
        ]
      }
      // 使用双向握手：等待 Remoter iframe 发送 remoter-ready 后再发送，
      // 避免 iframe 尚未挂载监听器导致消息丢失
      const handler = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return
        if (e.data?.type === 'remoter-ready') {
          window.removeEventListener('message', handler)
          const iframe = document.getElementById('remoterFrame') as HTMLIFrameElement
          iframe?.contentWindow?.postMessage(payload, window.location.origin)
        }
      }
      window.addEventListener('message', handler)
    }
  } catch (err) {
    console.warn('[WebAgent] 远程连接初始化失败，本地对话仍可正常运行：', err)
  }
}
```

然后在 Remoter 的 `App.vue` 中，**在已有的 `onMounted` 内**补充以下逻辑（`menuItems` 已在上方声明，无需重复定义）：

```ts
// remoter/src/App.vue（在 onMounted 内补充以下逻辑）

// 1. 通知父窗口：Remoter 已就绪，可发送 WebAgent 遥控信息
window.parent.postMessage({ type: 'remoter-ready' }, window.location.origin)

// 2. 监听 WebAgent 遥控信息
const webAgentHandler = (e: MessageEvent) => {
  if (e.origin !== window.location.origin) return
  if (e.data?.type === 'web-agent-info' && e.data.menuItems) {
    menuItems.value = e.data.menuItems
  }
}
window.addEventListener('message', webAgentHandler)

// 3. 组件卸载时清理监听
onUnmounted(() => {
  window.removeEventListener('message', webAgentHandler)
})
```

---

## 第八步：启动主应用与 Remoter

在 `package.json` 中配置 `concurrently` 同时启动两个工程：

```json
{
  "scripts": {
    "dev": "concurrently -n react,remoter \"vite\" \"pnpm -C remoter dev\"",
    "dev:react": "vite",
    "dev:remoter": "pnpm -C remoter dev"
  }
}
```

通过运行 `dev` 命令，同时启动 2 个应用。访问主应用地址（如 <http://localhost:5173>），页面中的 iframe 会加载 `/remoter`，经代理得到 Remoter 页面。

---

## 方案要点

| 项 | 说明 |
| --- | --- |
| **业务工具** | 页面 `useEffect` 内 `registerTool` + `AbortController` |
| **跨页跳转** | 自配 `navigate_to_page` + SDK `waitForRouteTools(path, routeToolsMap)` |
| **已移除** | SDK 不再提供 `setNavigator` / `routeConfig` / `registerPageTool` |

---

## 常见问题 (FAQ)

### 1. modelContext 应该从哪里获取？

统一使用 `document.modelContext`（`initializeBuiltinWebMCP()` 注入）。

```ts
const modelContext = (document as unknown as { modelContext?: ModelContext }).modelContext
```

### 2. 工具注销是如何实现的？

通过 `AbortController` 实现。在 `useEffect` 的 cleanup 函数中调用 `controller.abort()`，SDK 会自动注销该 signal 下注册的所有工具。页面内工具通过 `AbortController.abort()` 注销。

### 3. iframe 中的 Remoter 如何共享主窗口的 modelContext？

由于主应用通过 Vite 代理将 `/remoter` 转发到同源的 5179 端口，iframe 与主窗口处于同源环境。Remoter 的 `App.vue` 中通过 `window.parent.document.modelContext` 直接读取父窗口（主应用）的模型上下文，无需额外的 postMessage 通信。

### 4. 路由跳转失败怎么办？

React Router v7 的 `router.navigate(route)` 返回 Promise，如果跳转失败会 reject。确保自配 `navigate_to_page` 中 `router.navigate` 正常，且 `routeToolsMap` 与页面工具名一致。如果 AI 报告"工具不存在"，检查是否已跳转到对应路由且工具已在页面 `useEffect` 中注册。

### 5. 为什么 React Router v7 的 lazy 路由需要导出 `Component`？

React Router v7 的 `lazy` 属性期望返回一个模块对象，其中 `Component` 属性是实际渲染的组件。因此每个页面文件需要：

```tsx
export function Component() { /* ... */ }
export default Component
```

### 6. Remoter 子工程为什么要保留 Skills 目录？

Skills（WebSkills）是 Markdown 格式的业务知识文档，需要通过 `import.meta.glob` 加载。由于 Remoter 是 Vue 工程，`import.meta.glob` 的 `?raw` 查询参数在 Vue + Vite 环境下运行正常，因此 Skills 保留在 Remoter 侧加载，再通过 TinyRemoter 的 `:skills` prop 传入。
