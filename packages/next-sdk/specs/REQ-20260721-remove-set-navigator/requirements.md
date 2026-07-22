# Spec：移除 setNavigator / routeConfig，改为用户自配导航工具

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：

## 背景

此前 next-sdk 通过 `setNavigator` + `routeConfig` + `registerPageTool` 在工具调用时自动路由跳转并握手。该能力与业务路由强耦合，且握手仅依赖任意 `MSG_TOOL_REGISTERED`，无法确认目标页工具是否全部就绪。现改为由业务侧自行注册导航工具，并用「路由 → 工具名映射 + toolchange/getTools」完成精确握手。

## 领域术语表

- **routeToolsMap**：用户维护的 `Record<path, toolName[]>`，声明某路由页必须就绪的工具全集。
- **握手**：导航完成后，通过 WebMCP `toolchange` 与 `getTools()` 确认期望工具名均已出现。

## 目标用户 / 场景

- 集成 WebMCP 的 Vue / React / Angular SPA：AI 需先跳转到业务页，再调用该页工具。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/bridge.ts`
- `docs/best-practice/*.md`
- WebMCP：`document.modelContext.getTools` / `addEventListener('toolchange')`

## 范围

### In Scope

- 删除 `setNavigator`、`registerNavigateTool`、`RouteConfig`、`withPageTools`、`registerPageTool`、`setupModelContextBridge` 及整份 `page-tools/bridge.ts`
- Remoter 改用标准 `toolchange` 刷新工具列表；WXT 改用 `getTools()`
- 三套示例 + 文档提供可 copy 导航模版（工具定义在业务侧）
- 导出握手 helper `waitForRouteTools(path, routeToolsMap, options?)`（仅判断 path 对应工具是否全部就绪）

### Out of Scope

- 由 SDK 注册 `navigate_to_page` / 耦合业务 router
- 改造 page-agent-tool / remoter 核心逻辑（除依赖删除 API 的适配）
- 将 vue-router / react-router / @angular/router 做成 SDK 依赖

## 用户故事与验收标准

1. 作为集成方，我希望自行注册 `navigate_to_page`，以便用业务 router 控制跳转。
   - 验收：SDK 不再导出 `setNavigator` / `registerNavigateTool`；示例自行 `registerTool` 导航工具。
2. 作为集成方，我希望跳转后确认目标页工具已加载完，以便 LLM 可立即调用。
   - 验收：SDK 提供 `waitForRouteTools(path, routeToolsMap)`，基于 `toolchange` + `getTools` + 轮询超时完成握手。
3. 作为集成方，我希望业务工具在页面内注册，无需 `routeConfig`。
   - 验收：finance 等示例改为页面内 `registerTool({ execute })`。

## 非功能要求

- 破坏性变更：旧 API 直接删除，不保留兼容层
- 握手默认超时 5s，轮询间隔 100ms（可传 options 调整）

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 示例与文档已更新
- [x] `pnpm -F @opentiny/next-sdk build` / `test` 通过
