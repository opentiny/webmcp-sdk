# Tasks：registerPageAgentTool 暴露 mask 显隐句柄

- [x] Task 1: 返回 `{ showMask, hideMask }` 并新增 `PageAgentToolHandle` 类型
  - 产物：`packages/next-sdk/page-tools/page-agent-tool.ts`
- [x] Task 2: 从包入口导出新类型
  - 产物：`packages/next-sdk/index.ts` 补 `export type { PageAgentToolHandle }`
- [x] Task 3: 测试与构建无回归
- [x] Task 4: 重复注册时复用遮罩实例（验收标准 3）
  - 产物：`packages/next-sdk/page-tools/page-agent-tool.ts` 新增 `acquireSimulatorMask()`
  - 测试：`packages/next-sdk/test/page-tools/page-agent-tool-mask-reuse.test.ts`（含 **`复现：`**）

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```
