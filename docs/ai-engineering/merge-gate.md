# 合入门禁与 Branch Protection

## 自动化（仓库内）

| 检查 | Workflow | 作用 |
|---|---|---|
| PR Gate | `.github/workflows/pr-gate.yml` | 标题约定、Checklist、Gate Fields、Spec/复现路径 |
| CI Test | `.github/workflows/ci-test.yml` | 按路径跑单测 / 浏览器 E2E |
| Merge Ready | `pr-gate.yml` 汇总 job | 建议作为 Branch Protection 必填检查 |

本地预检：

```bash
node .github/scripts/pr-gate.mjs --title "fix(next-sdk): demo" --body-file /tmp/pr-body.md
```

## 维护者必做：Branch Protection

在 GitHub → Settings → Branches 为目标分支（如 `dev` / `main`）启用：

1. Require a pull request before merging  
2. Require status checks to pass before merging，勾选：**Merge Ready**（以及未汇入时的 CI Test 相关 checks）  
3. （可选）Require conversation resolution before merging  
4. 禁止向受保护分支直接 push  

> 仅有 Actions 红灯、未开 Branch Protection 时，仍可能强行合入。门禁生效依赖本页设置。

## 豁免

- Label `gate-bypass`：仅维护者应急，跳过 Spec/复现等 artifact 校验；须在 PR 写明原因。  
- 不提供「跳过全部测试」的默认开关。

## Draft PR

Draft 阶段 Gate 可能仅警告；转为 Ready for review 后必须全绿。
