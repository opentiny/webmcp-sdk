# Angular 工程接入 WebMCP + WebSkills 最佳实践

本文根据最新的 WebMCP 标准与 `doc-ai` 示例项目，带你一步步把普通 Angular 工程升级为 AI 驱动的智能应用。本章核心概念与适配流程，与 Vue 工程最佳实践是一致的，可以适当结合着一起看。本文重点描述关键步骤和与 Vue 工程差异的地方。

> **示例工程仓库**：[`packages/doc-ai-angular`](https://github.com/opentiny/next-sdk/tree/dev/packages/doc-ai-angular)

## 建议将Remoter 端集成在 iframe

- **TinyRemoter 是 Vue 组件**，依赖 Vue 运行时，无法在 Angular 中直接使用。
- 采用 **双 HTML 入口** 方案：
  - **主窗口**：Angular 应用（`index.html`），负责路由、MCP Server。
  - **子窗口**：独立 Vue 迷你应用（如 `remoter.html`），仅渲染 TinyRemoter UI，运行在 iframe 中。

这样，AI 对话 UI 在 iframe 里，MCP 工具与页面逻辑在主窗口，通过同一套 MCP 协议无缝协作。

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
│   │   ├── app.component.ts             # ② 根组件：initializeBuiltinWebMCP + createMcpServer
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

**Remoter 子包（Vue）：**

```bash
pnpm add @opentiny/next-sdk @opentiny/next-remoter
```

---

## 第一步：在 app.component.ts 激活 WebMCP 并注册自配导航

SDK **不再提供** `setNavigator`。请 `initializeBuiltinWebMCP()` 后调用 `createMcpServer(router)`，内部注册可复制的 `navigate_to_page`（见下方「自配路由跳转工具」）。

```ts
// src/app/app.component.ts
import { Component, OnInit, inject } from '@angular/core'
import { Router } from '@angular/router'
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router'
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import { createMcpServer } from '../mcp-servers'

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private router = inject(Router)
  async ngOnInit(): Promise<void> {
    initializeBuiltinWebMCP()
    await createMcpServer(this.router)
  }
}
```

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

---

## 第三步：主窗口注册自配导航工具

```ts
// src/mcp-servers/index.ts
import type { Router } from '@angular/router'
import { registerNavigateToPageTool } from './navigate-tool'
export { useWebAgentServer } from './useWebAgentServer'

export const createMcpServer = async (router: Router) => {
  registerNavigateToPageTool(router)
}
```

将完整可复制模版放到 `src/mcp-servers/navigate-tool.ts`（与示例 [`packages/doc-ai-angular/src/mcp-servers/navigate-tool.ts`](https://github.com/opentiny/next-sdk/blob/dev/packages/doc-ai-angular/src/mcp-servers/navigate-tool.ts) 一致）：维护 `routeToolsMap`，跳转后用 `toolchange` + `getTools` + 轮询超时握手。

---

## 自配路由跳转工具（可复制模版）

完整代码请直接复制示例文件：[`navigate-tool.ts`](https://github.com/opentiny/next-sdk/blob/dev/packages/doc-ai-angular/src/mcp-servers/navigate-tool.ts)。

要点：

1. `routeToolsMap: Record<path, toolName[]>`，工具名按模块全局唯一。
2. `registerNavigateToPageTool(router)` 内 `router.navigateByUrl` 后调用 `waitForRouteTools`。
3. `waitForRouteTools`：监听 `document.modelContext` 的 `toolchange`，每次 `getTools()` 校验期望工具名是否齐备；短轮询 + 超时兜底。

---

## 第四步：在页面组件中定义工具

`Angular 工程`中注册工具的方式与`Vue工程`一致的， 因为借助原生 `WebMcp API` 是不依赖于任何框架的。

```ts
import { Component, OnInit, OnDestroy } from '@angular/core'

const ORDER_QUERY_TOOL = 'order_query'
const modelContext = (document as any).modelContext

@Component({
  selector: 'app-orders',
  standalone: true,
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit, OnDestroy {
  private abortController = new AbortController()

  ngOnInit() {
    if (!modelContext) return

    modelContext.registerTool(
      {
        name: ORDER_QUERY_TOOL,
        title: '查询订单',
        description: '【订单管理工具】查询电商订单列表，可按订单号、客户姓名或状态筛选，不传参数则返回全部订单。',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: '订单号（可选）'
            }
          }
        },
        execute: async ({ orderId }: { orderId: string }) => {
          return { content: [{ type: 'text', text: `商品 ${orderId} 的状态：销售中` }] }
        }
      },
      { signal: this.abortController.signal }
    )
  }

  ngOnDestroy() {
    this.abortController.abort()
  }
}
```

## 第五步： 启动主应用与 Remoter

```json
{
  "scripts": {
    "dev": "concurrently -n ng,remoter \"ng serve\" \"pnpm -C remoter dev\"",
    "dev:ng": "ng serve",
    "dev:remoter": "pnpm -C remoter dev"
  }
}
```

通过运行`dev` 命令，同时启动2个应用。访问主应用地址（如 <http://localhost:5173>），页面中的 iframe 会加载 `/remoter`，经代理得到 Remoter 页面；
