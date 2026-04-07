# React 工程接入 WebMCP + WebSkills 最佳实践

本文根据最新的 WebMCP 标准与 `doc-ai` 示例项目，带你一步步把普通 React 工程升级为 AI 驱动的智能应用。

> **示例工程仓库**：[`packages/doc-ai-react`](https://github.com/opentiny/webmcp-sdk/tree/dev/packages/doc-ai-react)

它的核心概念与适配流程，与 `Vue` 工程最佳实践是一致的，可以适当结合着一起看。本文重点描述关键步骤和与Vue工程差异的地方 。

## 建议将Remoter 端集成在 iframe

- **TinyRemoter 是 Vue 组件**，依赖 Vue 运行时，无法在 React 中直接使用。
- 采用 **双 HTML 入口** 方案：
  - **主窗口**：React 应用（`index.html`），负责路由、MCP Server。
  - **子窗口**：独立 Vue 迷你应用（如 `remoter.html`），仅渲染 TinyRemoter UI，运行在 iframe 中。

这样，AI 对话 UI 在 iframe 里，MCP 工具与页面逻辑在主窗口，通过同一套 MCP 协议无缝协作。

---

## 推荐目录结构

完成本文所有步骤后，项目结构如下（以 `doc-ai-react` 为参考）：

```text
packages/doc-ai-react/
│── index.html                       # 主应用 HTML
├── src/
│   ├── main.tsx                         # React 入口
│   ├── App.tsx                          # 应用配置（含路由）
│   ├── mcp-servers/                     # MCP 工具定义（主窗口，与 app 平级）
├── vite.config.ts                       # 配置主应用的proxy代理
└── package.json                         # dev 脚本同时启动主应用 与 remoter
│
├── remoter/                             # 独立 Vue 子工程（iframe 内容）
│   ├── package.json
│   ├── vite.config.ts                   # base: '/remoter/'
│   ├── index.html                       # Remoter 入口
│   └── src/
│       ├── main.ts                      # Vue 挂载到 #remoter-app
│       ├── App.vue                      # TinyRemoter + createMessageChannelClientTransport
│       └── skills/                      # WebSkills（保留在 Vue 侧）
```

---

## 安装依赖

**主应用（React）：**

```bash
pnpm add @opentiny/next-sdk
```

**Remoter 子包（Vue）：**

```bash
pnpm add @opentiny/next-sdk @opentiny/next-remoter
```

---

## 第一步：在 main.ts 注册路由导航器

与 Vue 版类似，`setNavigator` 告诉 SDK 如何跳转页面。当 AI 调用某个工具而对应页面未打开时，SDK 会调用此函数自动导航。

```ts
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { initializeBuiltinWebMCP, setNavigator } from '@opentiny/next-sdk'
import './index.css'
import App from './App.tsx'
import { router } from './router.tsx'
import { createMcpServer } from './mcp-servers/index.ts'

// 1. 注册导航器，供 page-tool-bridge 在工具调用时自动跳转到对应路由
setNavigator(async (route) => {
  await router.navigate(route)
})

// 2. 激活浏览器内置 WebMCP 服务 (含低版本浏览器 Polyfill)
initializeBuiltinWebMCP()

// 3. 本地 MCP Server 启动：失败则直接抛出（核心功能）
await createMcpServer()

// 4. 渲染根组件
createRoot(document.getElementById('root')!).render(<App />)


```

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

## 第三步：主窗口创建 MCP Server

在 React 工程中，初始化 `McpServer`， 并在 `main.ts`中调用它 。

```ts
// src/mcp-servers/index.ts
import { registerNavigateTool } from '@opentiny/next-sdk'
import registerFinanceTools from './finance/tools'
export { useWebAgentServer } from './useWebAgentServer'

export const createMcpServer = async () => {
  registerNavigateTool((navigator as any).modelContext)

  // 仅保留财务工具在 mcp-servers 侧声明（其余工具已迁移到业务页面内一体化定义）
  registerFinanceTools()
}
```

---

## 第四步：在页面组件中定义工具

`React 工程`中注册工具的方式与`Vue工程`一致的， 因为借助原生 `WebMcp API` 是不依赖于任何框架的。 React 工程需要借助`useEffect` 来模拟生命周期：

```ts
useEffect(() => {
  const ADD_INVENTORY_TOOL = 'add_inventory'

  navigator.modelContext.registerTool({
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
    execute: async (params: any) => {
      const result = await modalRef.current.openModal(params)
      return { content: [{ type: 'text', text: result }] }
    }
  })

  return () => {
    navigator.modelContext.unregisterTool(ADD_INVENTORY_TOOL)
  }
}, [])
```

## 第五步： 启动主应用与 Remoter

```json
{
  "scripts": {
    "dev": "concurrently -n react,remoter \"vite\" \"pnpm -C remoter dev\"",
    "dev:react": "vite",
    "dev:remoter": "pnpm -C remoter dev"
  }
}
```

通过运行`dev` 命令，同时启动2个应用。访问主应用地址（如 <http://localhost:5173>），页面中的 iframe 会加载 `/remoter`，经代理得到 Remoter 页面；
