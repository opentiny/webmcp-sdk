# Spec：design.md

## 方案概述

类型推断：`inferPrType(title, labels)` — 先解析约定式标题的 type，再映射 label（与 `.github/labeler.yaml` 对齐）。Artifact：仅 `collectReproCandidates` / `collectSpecCandidates` + `resolveArtifact`（无手填）；候选数至少为一个即通过，多候选不报错。模板只保留行为说明与 breaking change。

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

**无约定式标题**且标签映射出多个不同 prType 时：返回 `labelConflict`，门禁**失败**（不得按标签顺序择一），须修正标题或移除冲突标签。冲突标签**不得**绕过 Repro/Spec 校验。

## 豁免

- `gate-bypass` / `emergency`：跳过 artifact（须与 label **完整精确匹配**；`gate-bypass:pending` 之类不生效）
- `skip-spec`：仅 Feature 跳过 Spec（同样精确匹配）

Labels 由 workflow 以 JSON 数组传入，解析时不按冒号切分。

## 模块影响

- `.github/scripts/lib/pr-gate-artifacts.mjs`：新增 `inferPrType`；`resolveArtifact` 去掉 explicit
- `.github/scripts/pr-gate.mjs`、`pr-gate.yml`、`PULL_REQUEST_TEMPLATE.md`
- `docs/ai-engineering/merge-gate.md`、`AGENTS.md`、`CONTRIBUTING.zh-CN.md`

## 测试策略

vitest 覆盖 `inferPrType` / `resolveArtifact`，包括 Repro test 与 Spec 多候选通过；脚本级冒烟用临时 title + changed-files。
