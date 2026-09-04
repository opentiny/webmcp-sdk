# @opentiny/next-sdk — Agent 指南

改本包时先读根 [`AGENTS.md`](../../AGENTS.md)（含文首 **任务分流**），再读本文，再按需打开 Skill / Spec / 测试。用户长文见 VitePress `docs/webmcp-sdk/`。

## 本包 Spec 硬提醒

修改下列任一内容前，**必须**先创建或更新 `packages/next-sdk/specs/REQ-YYYYMMDD-slug/`（仅当用户明确豁免 Spec 时可例外）：

- `page-tools/`
- 公开 a11y API / 类型（含 `A11yRoleRule`、`A11yConfig`、`PageAgentToolOptions` 等）
- `consoleCloudPageAgentToolOptions` 或其他默认/预设行为
- 无障碍树构建、剪枝、Static-Lift、序列化语义

然后：

1. 按 Spec `tasks.md` 改代码与 `test/page-tools/`
2. 需要时同步 `docs/webmcp-sdk/page-agent-tool.md` 与 `skills/page-agent/SKILL.md`

现有 Spec 索引见 [`specs/README.md`](./specs/README.md)。示例：[`specs/REQ-20260722-console-layout-landmark/`](./specs/REQ-20260722-console-layout-landmark/)。

## 推荐能力（主推）

本包面向浏览器 **内置 WebMCP**（`document.modelContext`）。新代码与约束说明请围绕：

- `initializeBuiltinWebMCP()`：注入 polyfill + 桥接；默认 `forcePolyfill: true`，覆盖会崩溃的 Chromium 实验性 native
- `document.modelContext.registerTool` / 业务工具注册
- `registerPageAgentTool` 及 a11y / 运行期配置 API

**不要**再把 `WebMcpServer` / `WebMcpClient` 作为默认推荐路径写进指引或示例（历史兼容代码可能仍存在，但非本仓库 Agent 约束的一部分）。

## 模块地图

| 路径 | 职责 |
|---|---|
| `page-tools/` | page-agent-tool、a11y、`waitForRouteTools`、高亮/遮罩、`initializeBuiltinWebMCP` |
| `agent/` | `AgentModelProvider`、`getAISDKTools` |
| `remoter/` | `createRemoter`、`QrCode` |
| `skills/index.ts` | **运行时**业务 Skill 工具（给终端用户 Agent），不是编码用 SKILL.md |
| `skills/page-agent/` | **编码** Agent Skill（本包 page-agent） |
| `runtime.ts` / `core.ts` / `dev.ts` / `index.ts` | 入口差异见下 |
| `specs/` | Feature Spec 实例 |
| `test/` | Vitest 可执行测试 |

## 入口差异

- `index.ts`：完整导出（含 page-agent、remoter、skills API、polyfill）
- `core.ts`：无 DOM 精简（Agent / `initializeBuiltinWebMCP` 等）
- `dev.ts`：本地开发辅助（如 `dom-inspect` / Inspect Assist），路径 `@opentiny/next-sdk/dev`
- `runtime.ts`：IIFE/CDN，挂 page-agent 相关 API，**不**自动 register

## Page Agent API（摘要）

详见 [`skills/page-agent/SKILL.md`](./skills/page-agent/SKILL.md) 与文档 `docs/webmcp-sdk/page-agent-tool.md`。

符号：`registerPageAgentTool`、`getPageAgentToolConfig`、`setPageAgentToolConfig`、`defineA11yConfig`、`consoleCloudPageAgentToolOptions`、`isConsoleCloudHost`、`buildA11yTree`、`searchA11yTree`、事件常量。

## Spec / 测试就近

- Spec：`packages/next-sdk/specs/REQ-YYYYMMDD-slug/{requirements,design,tasks}.md`
- 测试：`packages/next-sdk/test/**/*.test.ts`（page-tools 相关在 `test/page-tools/`）
- 模板：`docs/ai-engineering/templates/`

## 命令

```bash
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```
