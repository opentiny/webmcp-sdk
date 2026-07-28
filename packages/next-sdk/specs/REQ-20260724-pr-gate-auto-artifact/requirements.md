# Spec：requirements.md

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`（门禁脚本在仓库根 `.github/`）
- 关联 Issue：无（延续：去掉 Gate Fields 手填，标题/标签定类型）

## 背景

Gate Fields / PR Type 勾选对开发者重复劳动。仓库已有约定式标题与 auto-label（`fix`→`bug`，`feat`→`enhancement`）。门禁应：**标题优先定类型 → 标签兜底 → 仅从变更文件校验 Repro/Spec**，模板不再要求填写 Gate Fields。

## 目标用户 / 场景

- 开 `fix(...):` PR：变更含至少一个「复现：」测试即可过门禁，无需勾选/填路径
- 开 `feat(...):` PR：变更含至少一个完整 Spec 即可；琐碎用 label `skip-spec`
- 多候选：只要候选中存在可读取的有效 artifact 即可通过

## 范围

### In Scope

- 去掉模板中的 PR Type 勾选与 Gate Fields
- `pr-gate`：从标题 conventional type 推断；labels 兜底
- artifact 仅来自 `--changed-files-file`
- 豁免：`gate-bypass` / `emergency`；Feature 另支持 `skip-spec`
- 文档与 AGENTS / CONTRIBUTING 同步

### Out of Scope

- 自动改写 PR body
- 自动创建 Spec / 测试文件

## 用户故事与验收标准

1. `fix:` + 变更至少一个含「复现：」测试 → OK，无需 body 勾选
2. `feat:` + 变更至少一个完整 Spec → OK
3. `feat:` + label `skip-spec` → 跳过 Spec 校验
4. 多个有效 Repro test 或 Spec 候选 → OK，不要求收敛为一个
5. 标题无法识别且无唯一标签 → fail，提示改标题或打标签
6. 无约定式标题且 `bug`+`documentation` 等冲突标签 → fail（任一顺序），不得择一绕过 Repro/Spec
7. `gate-bypass:pending` 等非精确 label → 不触发豁免

## 明确不做

- 不再解析 Gate Fields / PR Type checkbox
