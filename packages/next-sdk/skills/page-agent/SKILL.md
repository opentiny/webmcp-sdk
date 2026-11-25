---
name: next-sdk-page-agent
description: >-
  @opentiny/next-sdk 的 page-agent-tool / a11y / registerPageAgentTool 相关开发。
  在修改 page-tools、无障碍配置、console-cloud 预设、runtime 注入时使用。
---

# next-sdk Page Agent Skill

## 动手前（硬门禁）

先遵守根 [`AGENTS.md`](../../../../AGENTS.md)「任务分流」。修改下列任一内容前，**必须**先创建或更新 `packages/next-sdk/specs/REQ-YYYYMMDD-slug/`（仅当用户明确豁免时可例外）：

- 公开 API / 类型（含 `A11yRoleRule`、`A11yConfig`、`PageAgentToolOptions` 等）
- `consoleCloudPageAgentToolOptions` 或其他默认/预设行为
- 无障碍树构建、剪枝、Static-Lift、序列化语义
- 需要更新 `docs/webmcp-sdk/page-agent-tool.md` 的行为说明

近期示例：[`specs/REQ-20261123-stable-ref-diff/`](../../specs/REQ-20261123-stable-ref-diff/)、[`specs/REQ-20260904-contenteditable-a11y-ref/`](../../specs/REQ-20260904-contenteditable-a11y-ref/)、[`specs/REQ-20260903-mask-cursor-lifecycle/`](../../specs/REQ-20260903-mask-cursor-lifecycle/)。

拿不准是否琐碎 → **先问用户**，不要默认开写。

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

- `registerPageAgentTool(options?)`：注册 `page-agent-tool`，内部调用 `initializeBuiltinWebMCP()`（默认 `forcePolyfill: true`，覆盖会崩溃的 Chromium 实验性 native）；重复调用为 **replace** 式重新初始化。返回 `{ showMask, hideMask, resetSession }`；重复调用（含页面中多份 SDK 副本）共用同一个遮罩（`window.__pageAgentSimulatorMask`）与当前生效的会话重置函数（`window.__pageAgentResetSession`），任一句柄都能控制当前生效实例；跨副本共用要求每份副本都读写该全局，不读写它的旧版本副本仍各自创建遮罩。Chrome 146+ 原生 `registerTool` 在非 origin-keyed 文档上抛 `SecurityError` DOMException；SDK 会中和 `document`/`navigator` native 并把 JS polyfill 挂到 document 实例。polyfill 在 `originAgentCluster === false` 时也会抛空消息 `SecurityError`，仅对 polyfill 实例绕过该检查。
- **稳定 `#ref` 与结构化 Diff**：会话内通过 `ElementRefAllocator`（`WeakMap<Element, number>` + 单调递增计数器）将 `#N` 绑定到 DOM 元素，不复用旧编号；`structured-yaml-diff.ts` 实现同父同 `#ref` 就近配对（跨父移动按各自文档位置输出）、全局无交互包装层/改名父节点抵消与 `DiffContextTracker` 最小父级缩进锚点，`PageStateCache` 负责 `rev`/`baseRev` 版本管理与三项熔断回退判定（前置大窗口 O(N) 低重合预判 / Myers `maxEditLength` 超限、变化行数 `> 50%`、Diff 字符体积 `>= full`）。状态 JSON 含 `kind: 'full' | 'diff'`、`url`、`rev`（及 `diff` 下的 `baseRev`）。失效 `#ref` 统一返回 `isError: true` + `errorCode: 'REF_NOT_PRESENTED'`（不塞整页树）；`PAGE_AGENT_CHAT_END_EVENT` 仅清空 Diff 基线（`rev` 持续递增、`#N` 不跨轮复用），新建/清空会话时由宿主显式调用 `handle.resetSession()` 归零。见 [`REQ-20261123-stable-ref-diff`](../../specs/REQ-20261123-stable-ref-diff/)。
- 运行期唯一配置面：`getPageAgentToolConfig` / `setPageAgentToolConfig`（`a11yConfig` 数组合并；`enableHighlight` / `cursorMode` 覆盖；支持 `mode: 'replace'`）。
- `cursorMode`：`'actionOnly'`（默认，仅操作类出光标） / `'always'` / `'never'`。无参 `showMask()` 默认不出光标；操作类结束后若遮罩仍开着且 `cursorMode !== 'always'` 则收光标。`always` 下显式 `{ showCursor: false }` 仍可临时隐藏；`never` 覆盖显式 `showCursor: true`。
- `whitelist` / `blacklist` 中的选择器字符串在构建无障碍树时 **动态解析**。
- `A11yRoleRule.name`：可选声明可访问名（不改 DOM），用于 landmark / 布局容器在 YAML 中保留分区名。
- 站点预设：云控制台用 `consoleCloudPageAgentToolOptions` + `isConsoleCloudHost()`（含 `ti-app-layout-*` landmark）。
- **`clipboard` action**：`text` 有值写剪切板、无值读剪切板；不依赖 `index`、不展示 mask；handler 见 `page-tools/handlers/clipboard.ts`。
- **contenteditable**：`browserState` 将自身声明 `contenteditable` 的编辑宿主标为 `textbox`（显式 role 优先）、分配 ref、输出 `[contenteditable]` token；`fill` 用该 ref 填写。继承可编辑的子孙不单独占 ref。见 [`REQ-20260904-contenteditable-a11y-ref`](../../specs/REQ-20260904-contenteditable-a11y-ref/)。

## 测试落点

`packages/next-sdk/test/page-tools/`（Vitest + jsdom）

修 Bug 须在用例中用中文写清复现场景，例如：

```ts
it('复现：… —— 前置…；步骤…；期望…', () => {})
```

## 注意

- 不要再引入已废弃的独立 `getA11yConfig` / `setA11yConfig`。
- 包约定见 [`packages/next-sdk/AGENTS.md`](../../AGENTS.md)。
