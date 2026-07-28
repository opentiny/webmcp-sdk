# 合入门禁与 Branch Protection

## 自动化（仓库内）

| 检查 | Workflow | 作用 |
|---|---|---|
| PR Gate | `.github/workflows/pr-gate.yml` | 约定式标题定类型；变更文件校验 Spec / 复现测试 |
| CI Test | `.github/workflows/ci-test.yml` | 按路径跑单测 / 浏览器 E2E |
| Merge Ready | `pr-gate.yml` 汇总 job | 建议作为 Branch Protection 必填检查 |

### 类型与 artifact（无需 Gate Fields）

1. **类型**：PR 标题 `type(scope): subject` 优先（`fix`→bug，`feat`→feature，…）；标签兜底（`bug` / `enhancement` / `documentation` / `refactoring`，与 `labeler.yaml` 一致）。
2. **Bug（fix）**：变更中须至少有一个含中文 **`复现：`** 的 `packages/*/test/**/*.{test,spec}.*`。
3. **Feature（feat）**：变更中须至少有一个完整 `packages/*/specs/REQ-*/`（requirements/design/tasks），并至少有一个 `packages/*/test/**/*.{test,spec}.*` 测试文件。琐碎改动打 label **`skip-spec`** 仅跳过 Spec 校验。
4. **豁免**：label **`gate-bypass`** / **`emergency`**（维护者应急）。

同一 PR 可以包含多个测试或 Spec 候选；各类必需 artifact 只要至少有一个可读取的有效候选即可通过。

本地预检：

```bash
# 与 CI 一致：只统计 Added/Copied/Modified/Renamed
git diff --name-only --diff-filter=ACMR origin/dev...HEAD > /tmp/changed.txt
node .github/scripts/pr-gate.mjs \
  --title "fix(next-sdk): demo" \
  --labels '[]' \
  --changed-files-file /tmp/changed.txt

# Feature 琐碎 Spec 豁免示例（changed.txt 中仍须有测试文件）
PR_LABELS='["skip-spec"]' SKIP_SPEC=true node .github/scripts/pr-gate.mjs \
  --title "feat(docs): typo" \
  --labels '["skip-spec"]' \
  --changed-files-file /tmp/changed.txt
```

## 维护者必做：Branch Protection

在 GitHub → Settings → Branches 为目标分支（如 `dev` / `main`）启用：

1. Require a pull request before merging  
2. Require status checks to pass before merging，勾选：**Merge Ready**（以及未汇入时的 CI Test 相关 checks）  
3. （可选）Require conversation resolution before merging  
4. 禁止向受保护分支直接 push  

> 仅有 Actions 红灯、未开 Branch Protection 时，仍可能强行合入。门禁生效依赖本页设置。

## 豁免

- Label `gate-bypass`：仅维护者应急，跳过 Spec/测试等 artifact 校验；须在 PR 写明原因。
- Label `skip-spec`：琐碎 Feature 仅跳过 Spec，仍须包含测试文件。
- 不提供「跳过全部测试」的默认开关。

## Draft PR

Draft 阶段 Gate 可能仅警告；转为 Ready for review 后必须全绿。
