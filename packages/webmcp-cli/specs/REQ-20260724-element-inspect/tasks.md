# Tasks：元素检视（Cursor 式）

## 任务列表

- [x] Task 1: 实现 element-inspect 纯逻辑与 overlay
  - 产物：`src/inject/element-inspect/`（registry / metadata / clipboard-ref / overlay / mode / register-tool / index）
  - [x] 测试：`test/element-inspect.test.ts`（引用协议、DOM Path、HTML 截断、元数据文本）

- [x] Task 2: 接入 page-init 与 browser tabId 注入
  - 产物：修改 `src/inject/page-init.ts`、`src/browser.ts`
  - [x] 测试：E2E 断言 `inspect-element` 出现在 `webmcpTools` 且可按 id 查询（`test/browser.e2e.test.ts`）

- [x] Task 3: 更新 Skill 与用户文档
  - 产物：`packages/webmcp-cli-skill/SKILL.md`、`docs/webmcp-cli/webmcp-cli.md`、`docs/webmcp-cli/webmcp-cli-skill.md`

- [x] Task 4: 构建与验收
  - 命令：`pnpm --filter @opentiny/webmcp-cli build && pnpm --filter @opentiny/webmcp-cli test`
  - 另：`pnpm --filter @opentiny/webmcp-cli test:browser` 已通过
- [x] Task 5: 控制浮钮（受控标识 + 切换检视）
  - 产物：`src/inject/element-inspect/control-fab.ts`；更新 Spec / Skill / docs
  - 测试：浮钮单测 + E2E 断言页面存在 `#webmcp-cli-control-fab`

## 依赖顺序

1 → 2 → 3 → 4

## 验收命令

```bash
pnpm --filter @opentiny/webmcp-cli build
pnpm --filter @opentiny/webmcp-cli test
# 可选：
pnpm --filter @opentiny/webmcp-cli test:browser
```
