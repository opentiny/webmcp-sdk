# Tasks：WebMCP Chat 模板

## 任务列表

- [x] Task 1: 增加 `WebMcpChat.vue`，用套件 runtime 对接 `document.modelContext`
  - 产物：`packages/doc-ai/src/templates/WebMcpChat.vue`
  - 测试：doc-ai 无 Vitest。以 `vue-tsc --noEmit` 做类型检查，并在浏览器确认面板渲染
- [x] Task 2: `App.vue` 改用模板，去掉 Remoter；更新依赖与首页文案
- [x] Task 3: 去掉自定义插槽，技能改为套件 `skillPlugin`
  - 产物：`WebMcpChat.vue`、`App.vue`
  - 测试：浏览器确认原生 `TrChat` 渲染，MCP 列表含页面工具，技能由套件选择
  - 产物：`App.vue`、`main.ts`、`package.json`、`views/home/index.vue`
  - 测试：同上

## 依赖顺序

1 → 2

## 验收命令

```bash
pnpm -F doc-ai exec vue-tsc --noEmit -p tsconfig.app.json
```
