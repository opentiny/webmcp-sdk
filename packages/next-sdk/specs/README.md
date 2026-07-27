# next-sdk Specs

本目录存放 **本包** Feature Spec 实例（就近原则）。模板见 [`docs/ai-engineering/templates/`](../../../docs/ai-engineering/templates/)。

**Agent**：改本包非琐碎能力前必须先在此建 `REQ-…`（见根 [`AGENTS.md`](../../../AGENTS.md) 任务分流）。

## 命名

`REQ-YYYYMMDD-短横线 slug/`，内含：

- `requirements.md`
- `design.md`
- `tasks.md`

## 状态

草稿 → 评审 → 开发中 → 已交付（写在 `requirements.md` 元信息中）。

## 索引（近期）

| Spec | 说明 |
|---|---|
| [`REQ-20260727-dom-inspect`](./REQ-20260727-dom-inspect/) | Inspect Assist（`enableInspectAssist`）：点选复制 Cursor 元素卡片，辅助改样式/逻辑 |
| [`REQ-20260724-pr-gate-auto-artifact`](./REQ-20260724-pr-gate-auto-artifact/) | PR Gate：标题定类型 + 变更文件自动校验 Repro/Spec |
| [`REQ-20260722-console-layout-landmark`](./REQ-20260722-console-layout-landmark/) | `A11yRoleRule.name` + 云控制台 ti-app-layout landmark |
| [`REQ-20260721-remove-set-navigator`](./REQ-20260721-remove-set-navigator/) | 移除 setNavigator / routeConfig |

## 与测试

Spec 是文档；可执行测试在 `../test/`。禁止把 Spec 放进 `test/`。

## 跨包需求

若改动跨多个包，Spec 放在 **主责包** 的 `specs/`；`feat:` PR 的变更中须包含该 Spec 目录（门禁自动校验）。
