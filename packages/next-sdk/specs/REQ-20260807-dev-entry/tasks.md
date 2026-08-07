# Spec：dev 入口拆分任务

## 任务列表

- [x] Task 1: 新增 `dev.ts` 再导出 `dom-inspect`
  - 产物：`packages/next-sdk/dev.ts`
- [x] Task 2: Vite / package.json 注册 `dev` 入口
  - 产物：`packages/next-sdk/vite.config.ts`、`packages/next-sdk/package.json`
- [x] Task 3: 从 `index.ts` 移除 Inspect Assist 导出；更新 `doc-ai` 导入
  - 产物：`packages/next-sdk/index.ts`、`packages/doc-ai/src/main.ts`
- [x] Task 4: 入口契约测试
  - [x] 测试：`packages/next-sdk/test/dev-entry.test.ts`
    - 断言主入口源码不再导出 Inspect Assist
    - 断言 `dev.ts` 导出关键符号
    - 断言 `package.json` exports 含 `./dev`
- [x] Task 5: 更新 `AGENTS.md` 入口差异与 Specs 索引
  - 产物：`packages/next-sdk/AGENTS.md`、`packages/next-sdk/specs/README.md`
  - 将 Spec 状态标为已交付

## 依赖顺序

1 → 2 → 3 → 4 → 5

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```
