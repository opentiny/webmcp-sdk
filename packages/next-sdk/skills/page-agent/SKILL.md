---
name: next-sdk-page-agent
description: >-
  @opentiny/next-sdk 的 page-agent-tool / a11y / registerPageAgentTool 相关开发。
  在修改 page-tools、无障碍配置、console-cloud 预设、runtime 注入时使用。
---

# next-sdk Page Agent Skill

## 何时使用

- 改 `packages/next-sdk/page-tools/**`
- 注册或配置 `registerPageAgentTool`
- 调整 `a11yConfig`、站点预设 `consoleCloudPageAgentToolOptions`
- 改 `runtime.ts` 挂载的 page-agent API

权威长文：[docs/webmcp-sdk/page-agent-tool.md](../../../../docs/webmcp-sdk/page-agent-tool.md)

## 入口

| 入口 | 用途 |
|---|---|
| `index.ts` | 完整浏览器侧导出 |
| `core.ts` | 无 DOM 精简入口（不含完整 page-agent API） |
| `runtime.ts` | CDN/IIFE：挂 API，**不**自动 `registerPageAgentTool` |

## 关键 API（符号级）

```ts
import {
  registerPageAgentTool,
  getPageAgentToolConfig,
  setPageAgentToolConfig,
  defineA11yConfig,
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
  buildA11yTree,
  searchA11yTree,
  PAGE_AGENT_TOOL_CALL_EVENT,
  PAGE_AGENT_TOOL_RESULT_EVENT,
} from '@opentiny/next-sdk'
```

- `registerPageAgentTool(options?)`：注册 `page-agent-tool`，内部调用 `initializeBuiltinWebMCP()`；重复调用为 **replace** 式重新初始化。
- 运行期唯一配置面：`getPageAgentToolConfig` / `setPageAgentToolConfig`（`a11yConfig` 数组合并；`enableHighlight` 覆盖；支持 `mode: 'replace'`）。
- `whitelist` / `blacklist` 中的选择器字符串在构建无障碍树时 **动态解析**。
- 站点预设：云控制台用 `consoleCloudPageAgentToolOptions` + `isConsoleCloudHost()`。

## 测试落点

`packages/next-sdk/test/page-tools/`（Vitest + jsdom）

修 Bug 须在用例中用中文写清复现场景，例如：

```ts
it('复现：… —— 前置…；步骤…；期望…', () => {})
```

## 注意

- 不要再引入已废弃的独立 `getA11yConfig` / `setA11yConfig`。
- 包约定见 [`packages/next-sdk/AGENTS.md`](../../AGENTS.md)。
