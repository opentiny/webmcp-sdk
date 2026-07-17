# Spec：AI 友好知识工程脚手架

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联：仓库级 AI 工程化落地

## 背景

为棕地 monorepo 建立跨工具 AGENTS.md / Specs / Skills 安装 / PR Gate，降低 Agent 失真并强制质量闭环。

## 范围

### In Scope

- 根 AGENTS.md、docs/ai-engineering、next-sdk 包内 AGENTS/specs/skills
- skills.manifest + skills:sync
- PR Gate Actions

### Out of Scope

- 历史功能全量补 Spec/测试
- 大型 Skill npm 包内容本身（仅预留依赖与同步）

## 验收标准

1. `pnpm skills:sync` 可链接本地 page-agent Skill
2. `node .github/scripts/pr-gate.mjs` 对不合规/合规 body 行为正确
3. 文档说明 Branch Protection 勾选 Merge Ready
