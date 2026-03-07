# doc-ai-angular

Angular 版本的 webMCP + webSkills 最佳实践示例，对应 `doc-ai`（Vue 版本）。

## 核心方案：多入口 + MessageChannel 跨窗口连接

Angular 无法直接使用 `@opentiny/next-remoter` 中的 Vue 组件，采用 **双 HTML 入口** 方案：

- `index.html`：Angular 主应用，运行 MCP Server + 业务逻辑
- `remoter.html`：独立 Vue 迷你应用（在 iframe 中），只渲染 TinyRemoter UI

两者通过 `createMessageChannelServerTransport` / `createMessageChannelClientTransport` 建立 MCP 连接。

## 架构图

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Angular 主应用 (index.html / 主窗口)                  │
│                                                                      │
│  AppComponent                                                        │
│    ├─ setNavigator(Angular Router)  ← 直接调用，无需 postMessage      │
│    └─ RemoterBridgeService.init()                                    │
│         └─ WebMcpServer + withPageTools                              │
│              ├─ registerTool('product-guide', { route: '/comprehensive' })    │
│              ├─ registerTool('price-protection-*', { route: '/price-protection' }) │
│              └─ createMessageChannelServerTransport('local-mcp')     │
│                   └─ serverTransport.listen()  ← 等待 iframe 连接   │
│                                                                      │
│  页面组件（同窗口，page-tool-bridge postMessage 完全在主窗口内工作）  │
│    ├─ ComprehensiveComponent.ngOnInit → registerPageTool(handlers)   │
│    └─ PriceProtectionComponent.ngOnInit → registerPageTool(handlers) │
│                                                                      │
│                              │ MessageChannel 协议                   │
│                              │ (createMessageChannelServerTransport) │
└──────────────────────────────│───────────────────────────────────────┘
                               │
┌──────────────────────────────│───────────────────────────────────────┐
│           Vue iframe (remoter.html / 子窗口)                          │
│                                                                      │
│  RemoterApp.vue                                                      │
│    ├─ createMessageChannelClientTransport('local-mcp', window.parent)│
│    │    └─ 通过 MessageChannel 连接 Angular 主窗口的 MCP Server      │
│    ├─ TinyRemoter (mcpServers: { transport: clientTransport })       │
│    └─ import.meta.glob('./skills/**/*')  ← Skills 保留在 Vue 侧      │
└──────────────────────────────────────────────────────────────────────┘
```

## 与 Vue 版本的对比

| Vue 版本 | Angular 版本 |
|---------|-------------|
| `WebMcpServer` + `withPageTools` 在 `App.vue` | `WebMcpServer` + `withPageTools` 在 `src/app/mcp-servers/index.ts` |
| `createMessageChannelPairTransport()` (内存对) | `createMessageChannelServerTransport('local-mcp')` (跨窗口) |
| TinyRemoter 直接使用 `clientTransport` (对内) | TinyRemoter 使用 `createMessageChannelClientTransport('local-mcp', window.parent)` |
| `setNavigator` 在 `main.ts` | `setNavigator` 在 `AppComponent.ngOnInit` |
| `onMounted + registerPageTool` | `ngOnInit + registerPageTool` (框架无关 API) |
| `onUnmounted + cleanup()` | `ngOnDestroy + cleanup()` |
| Skills 在 `src/skills/` | Skills 在 `src/remoter/skills/` (保留在 Vue 侧) |

## 启动

```bash
pnpm dev          # 同时起 Angular (8099) 与 Remoter (5179)
pnpm dev:ng       # 仅 Angular
pnpm dev:remoter  # 仅 Remoter
```

访问 http://localhost:8099

### 若 `ng serve` 一直卡在 Building...

- **main.ts**：已移除 `import '@angular/compiler'`（application 为 AOT，无需在浏览器加载 JIT compiler）。
- 当前使用 **npm 上的 @opentiny/next-sdk@0.2.6-beta.0** 构建产物，可减轻解析卡住问题。

**建议**：在仓库根目录 `.npmrc` 中增加 `node-linker=hoisted` 后执行 `pnpm install`，再重试；或增大 Node 内存后执行 `ng serve`。

## 目录结构

```
src/
├── main.ts                        # Angular 启动入口
├── styles.scss                    # 全局样式
├── app/
│   ├── app.config.ts              # provideRouter 配置
│   ├── app.routes.ts              # 路由定义
│   ├── app.component.ts           # 根组件：setNavigator + 启动 MCP Server
│   ├── mcp-servers/               # MCP 工具注册（在 Angular 主窗口）
│   │   ├── index.ts               # createMessageChannelServerTransport
│   │   ├── product-guide/tools.ts
│   │   └── price-protection/tools.ts
│   ├── services/
│   │   └── remoter-bridge.service.ts  # 简单的 MCP Server 初始化服务
│   └── pages/
│       ├── home/                  # 首页
│       ├── comprehensive/         # 商品管理（ngOnInit 调用 registerPageTool）
│       └── price-protection/      # 价保管理（ngOnInit 调用 registerPageTool）
remoter/                           # 独立子包（与 src 同级），iframe 内 Vue TinyRemoter
    ├── package.json + vite.config.ts
    ├── index.html
    └── src/
        ├── main.ts, App.vue
        └── skills/
```
