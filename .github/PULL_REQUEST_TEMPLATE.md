# Pull Request (OpenTiny NEXT-SDKs)

> 以下标题与勾选格式供 CI（PR Gate）解析，**请勿改章节标题文案**。

## PR Type

What kind of change does this PR introduce?（有且仅有一个 `[x]`）

- [ ] Bugfix
- [ ] Feature
- [ ] Code style update (formatting, local variables)
- [ ] Refactoring (no functional changes, no api changes)
- [ ] Build-related changes
- [ ] CI-related changes
- [ ] Documentation-related changes
- [ ] Other

## PR Checklist

- [ ] Commit / PR 标题符合 `type(scope): subject`（见 CONTRIBUTING）
- [ ] 已按类型填写下方 Gate Fields
- [ ] Bug fix：已补充中文复现测试（`复现：`）
- [ ] Feature：已关联包内 Spec（`packages/<pkg>/specs/REQ-.../`）
- [ ] Docs 已按需更新
- [ ] Refactoring：无行为变更或已补回归 / 已填 Skip reason
- [ ] Other：已在说明中写清原因

## Gate Fields（CI 读取，请按类型填写）

- Issue: 
- Spec: 
- Repro test: 
- Skip reason: 

（Bug fix 必填 Repro test；Issue 可选。Feature 必填 Spec；豁免时填 Skip reason。）

## What is the current behavior?

Issue Number: 

## What is the new behavior?

## Does this PR introduce a breaking change?

- [ ] Yes
- [ ] No

## Other information
