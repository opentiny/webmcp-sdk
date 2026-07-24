# Spec：design.md

## 方案概述

类型推断：`inferPrType(title, labels)` — 先解析约定式标题的 type，再映射 label（与 `.github/labeler.yaml` 对齐）。Artifact：仅 `collectReproCandidates` / `collectSpecCandidates` + `resolveArtifact`（无手填）。模板只保留行为说明与 breaking change。

## 类型映射

| 来源 | → prType |
|---|---|
| 标题 `fix` | bug |
| 标题 `feat` | feature |
| 标题 `docs` | docs |
| 标题 `refactor` | refactor |
| 标题 `ci` / `build` / `style` | ci / build / style |
| 标题其它约定 type | other（不强制 Spec/Repro） |
| label `bug` | bug（标题未命中时） |
| label `enhancement` | feature |
| label `documentation` / `refactoring` / `chore` | docs / refactor / other |

标题与标签冲突时：**以标题为准**，并对标签冲突打 warning。

## 豁免

- `gate-bypass` / `emergency`：跳过 artifact
- `skip-spec`：仅 Feature 跳过 Spec

## 模块影响

- `.github/scripts/lib/pr-gate-artifacts.mjs`：新增 `inferPrType`；`resolveArtifact` 去掉 explicit
- `.github/scripts/pr-gate.mjs`、`pr-gate.yml`、`PULL_REQUEST_TEMPLATE.md`
- `docs/ai-engineering/merge-gate.md`、`AGENTS.md`、`CONTRIBUTING.zh-CN.md`

## 测试策略

vitest 覆盖 `inferPrType` / `resolveArtifact`；脚本级冒烟用临时 title + changed-files。
