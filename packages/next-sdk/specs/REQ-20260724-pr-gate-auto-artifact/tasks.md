# Spec：tasks.md

## Tasks

- [x] Task 1: artifacts 库（collect / resolve / inferPrType）
- [x] Task 2: pr-gate 去掉 Gate Fields / checkbox，接入标题+标签
- [x] Task 3: workflow 传 labels + changed-files
- [x] Task 4: 精简 PR 模板与文档（merge-gate / AGENTS / CONTRIBUTING）
- [x] Task 5: 单测 `pr-gate-auto-artifact.test.ts`
  - 命令：
    - `pnpm -F @opentiny/next-sdk exec vitest run test/page-tools/pr-gate-auto-artifact.test.ts`
    - `pnpm -F @opentiny/next-sdk test`
    - `pnpm -F @opentiny/next-sdk build`
- [x] Task 6: 放宽 artifact 候选数量限制，Repro test / Spec 至少一个有效候选即通过
- [x] Task 7: 增加多候选回归测试并同步门禁文档
