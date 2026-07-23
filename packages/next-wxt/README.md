# @opentiny/next-wxt

基于 [WXT](https://wxt.dev/) + Vue 3 的 OpenTiny AI 浏览器扩展。

## 架构概要

- **页面工具**：content script 注入 `vendor/runtime.js`，在 MAIN world 调用 `registerPageAgentTool`，使用页面内置 `document.modelContext`（WebMCP）
- **侧边栏**：TinyRemoter + 本地工具（如 `tabs-manager`），代理当前页 WebMCP 工具
- **消息**：`utils/messages.ts` 的 `sendRuntimeMessage` / `onRuntimeMessage`

## 常用命令

```bash
pnpm --filter @opentiny/next-wxt dev
pnpm --filter @opentiny/next-wxt build
```
