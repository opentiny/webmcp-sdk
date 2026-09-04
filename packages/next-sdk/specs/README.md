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
| [`REQ-20260904-force-webmcp-polyfill`](./REQ-20260904-force-webmcp-polyfill/) | 默认强制 JS polyfill，覆盖会崩溃的 Chromium 实验性 `modelContext` |
| [`REQ-20260903-mask-cursor-lifecycle`](./REQ-20260903-mask-cursor-lifecycle/) | 遮罩接管态默认不出光标；句柄透传 `showCursor`；操作结束收光标；`cursorMode` |
| [`REQ-20260817-clipboard-handler`](./REQ-20260817-clipboard-handler/) | Page Agent `clipboard` action：读写系统剪切板（`text` 有值写、无值读） |
| [`REQ-20260807-dev-entry`](./REQ-20260807-dev-entry/) | 新增 `dev` 入口：将 `dom-inspect` 等本地开发能力从主入口拆出 |
| [`REQ-20260729-user-do-action`](./REQ-20260729-user-do-action/) | mask 展示期间用户 trusted 点击 → `page-agent-user-do-action` 事件 |
| [`REQ-20260727-dom-inspect`](./REQ-20260727-dom-inspect/) | Inspect Assist（`enableInspectAssist`）：点选复制 Cursor 元素卡片，辅助改样式/逻辑 |
| [`REQ-20260724-pr-gate-auto-artifact`](./REQ-20260724-pr-gate-auto-artifact/) | PR Gate：标题定类型 + 变更文件自动校验 Repro/Spec |
| [`REQ-20260722-mask-handle`](./REQ-20260722-mask-handle/) | `registerPageAgentTool` 返回 `{ showMask, hideMask }` |
| [`REQ-20260722-console-layout-landmark`](./REQ-20260722-console-layout-landmark/) | `A11yRoleRule.name` + 云控制台 ti-app-layout landmark |
| [`REQ-20260721-remove-set-navigator`](./REQ-20260721-remove-set-navigator/) | 移除 setNavigator / routeConfig |

## 与测试

Spec 是文档；可执行测试在 `../test/`。禁止把 Spec 放进 `test/`。

## 跨包需求

若改动跨多个包，Spec 放在 **主责包** 的 `specs/`；`feat:` PR 的变更中须同时包含该 Spec 目录和至少一个测试文件（门禁自动校验）。
