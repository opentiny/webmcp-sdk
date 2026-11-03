# Tasks：WebMCP 工具公共适配

## 任务列表

- [x] Task 1: 实现并导出 `createWebMcpToolAdapter`
  - 产物：`packages/next-sdk/agent/webmcp-tool-adapter.ts`、`packages/next-sdk/index.ts`
  - [x] 测试：`packages/next-sdk/test/agent/webmcp-tool-adapter.test.ts`
- [x] Task 2: doc-ai 模板改用该导出
  - 产物：`packages/doc-ai/src/templates/WebMcpChat.vue`
  - [x] 测试：更新 `packages/doc-ai/test/webmcp-chat-template.test.mjs`

## 依赖顺序

1 → 2

## 验收命令

```bash
pnpm -F @opentiny/next-sdk exec vitest run test/agent/webmcp-tool-adapter.test.ts
node --test packages/doc-ai/test/webmcp-chat-template.test.mjs
```
