# Tasks：AI 友好知识工程脚手架

- [x] Task 1: docs/ai-engineering 横切层
- [x] Task 2: skills.manifest + skills-sync + page-agent Skill
- [x] Task 3: 根/包 AGENTS.md
- [x] Task 4: 可机读 PR/Issue/CONTRIBUTING
- [x] Task 5: pr-gate 脚本与 workflow
- [x] Task 6: 自检不合规拦截 / 合规通过
  - [x] 测试：`packages/next-sdk/test/page-tools/pr-gate-repro.fixture.test.ts`

## 验收命令

```bash
pnpm skills:sync
node .github/scripts/pr-gate.mjs --help
pnpm -F @opentiny/next-sdk exec vitest run test/page-tools/pr-gate-repro.fixture.test.ts
```
