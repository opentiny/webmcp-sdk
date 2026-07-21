# Design：AI 友好知识工程脚手架

## 方案概述

横切知识放 `docs/ai-engineering/`；包内 Spec/测试/薄 Skill 就近；大 Skill 经 npm+prepare 同步到 `.agents/skills`；合入由 `pr-gate.yml` 强制 Checklist。

## 涉及模块 / 文件

- `AGENTS.md`、`skills.manifest.json`、`scripts/skills-sync.mjs`
- `packages/next-sdk/AGENTS.md`、`skills/page-agent/`、`specs/`
- `.github/scripts/pr-gate.mjs`、`.github/workflows/pr-gate.yml`
- Issue/PR 模板、`CONTRIBUTING.zh-CN.md`

## API / 行为变更

无运行时 API 变更；仅工程化与门禁。
