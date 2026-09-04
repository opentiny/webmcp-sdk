# Design：强制 JS Polyfill 覆盖 Chromium 实验性 modelContext

## 方案概述

`@mcp-b/webmcp-polyfill@5.1.0` 见 native 即 no-op，且已删除 `forceOverride`。与 3.x 不同，5.x 把 getter 装在 **`Document.prototype`**：若原型上已有 native，polyfill **不会替换**该 getter。

因此 `initializeBuiltinWebMCP` 在 `forcePolyfill !== false` 时：

1. 若 `Document.prototype.modelContext` 可配置且不是 polyfill，则删除该原型属性，让 5.x 自己安装 getter。
2. 若 `document.modelContext` 仍是 native，则影子化为 `undefined`，避免 polyfill 提前 return。
3. 调用 `initializeWebMCPPolyfill()`。
4. 若实例上的 `undefined` 影子挡住了刚装上的原型 getter，则删掉实例属性。原型 native 不可配置时保持影子化并 `console.warn`。

5.1.0 ESM **无 import 副作用**。`registerTool` 返回 Promise：工具仍在首个 `await` 前写入 registry，但重复名、非法描述、已 abort 的 `signal` 会 **reject**。同步 `try/catch` 接不住该失败。本 PR 范围内 `registerPageAgentTool` 已对返回值 `.catch`；业务侧应 `await` 或 `.catch`，不要把 Promise 丢掉。

## 涉及模块 / 文件

| 路径 | 职责 |
| --- | --- |
| `pnpm-workspace.yaml` | catalog：`@mcp-b/webmcp-polyfill` / `@mcp-b/webmcp-types` → `^5.1.0` |
| `packages/next-sdk/page-tools/initialize-builtin-WebMCP.ts` | `forcePolyfill`、摘掉 document native、init |
| `packages/next-sdk/index.ts` / `core.ts` | 导出 `initializeBuiltinWebMCP` |
| `packages/webmcp-cli/src/inject/page-init.ts` | 走 `registerPageAgentTool`，不直调 polyfill |
| `packages/next-sdk/test/page-tools/initialize-builtin-WebMCP.test.ts` | 行为测试（含原型 getter） |
| `docs/webmcp-sdk/global-tools.md` | 公开 API 说明 |

`registerPageAgentTool` 已调用 `initializeBuiltinWebMCP()`，无参即默认强制 polyfill。

## 核心数据结构 / 类型定义

```typescript
export function initializeBuiltinWebMCP(options?: {
  /** @default true */
  forcePolyfill?: boolean
}): void

const POLYFILL_MARKER = '__isWebMCPPolyfill'
```

判定 polyfill：`Boolean(ctx && ctx[POLYFILL_MARKER])`。

原型 native（可配置）用 `Reflect.deleteProperty(Document.prototype, 'modelContext')` 摘掉，不读写 `WeakMap.prototype`。

## 依赖变更

- `@mcp-b/webmcp-polyfill`：`^3.0.0` → `^5.1.0`
- `@mcp-b/webmcp-types`：`^3.0.0` → `^5.1.0`（与 polyfill 对齐）

## API / 行为变更

| 符号或行为 | 变更类型 | 说明 |
| --- | --- | --- |
| `initializeBuiltinWebMCP(options?)` | 修改 | 可选 `forcePolyfill`，默认 `true` |
| 有 native 时的默认行为 | 修改 | 不再沿用 native，改为 JS polyfill |
| polyfill 大版本 | 修改 | 3 → 5；`registerTool` 返回 Promise（失败路径需 await / `.catch`）；无 ESM auto-init |

## 数据流 / 时序

```mermaid
flowchart TD
  A[initializeBuiltinWebMCP] --> B{forcePolyfill !== false?}
  B -->|否| D[initializeWebMCPPolyfill 后结束]
  B -->|是| C{原型 modelContext 可配置且为 native?}
  C -->|是| P[删除 Document.prototype.modelContext]
  C -->|否| S
  P --> S{document 仍是 native?}
  S -->|是| T[实例影子化为 undefined]
  S -->|否| E
  T --> E[initializeWebMCPPolyfill]
  E --> F[去掉实例上的 undefined 影子]
  F --> G{document 已是 polyfill?}
  G -->|是| H[结束]
  G -->|否| J[影子化残留 native 并 console.warn]
```

## 风险与兼容

- **Chrome 内置 Agent 看不到页内工具**：工具只在 JS polyfill 注册表。对本 SDK / remoter 链路是预期。
- **已捕获的 native 引用**：须在入口最先调用本函数。
- **5.x `isSecureContext === false` 时 polyfill 直接 return**：非安全上下文本来也不该走 WebMCP。
- **`registerTool` Promise**：5.1.0 校验失败会 reject。`registerPageAgentTool` 已 `.catch`；其它调用方须自行 `await` 或 `.catch`，否则可能出现未处理 rejection。
- **不可配置 native 原型属性**：删不掉则实例影子化为 `undefined` 并 warn，避免调用 native `getTools`。

## 备选方案（未采用）

- **继续停在 3.0.0**：短期强制覆盖更简单，但后续仍要跨两个 major。
- **`@mcp-b/global` 的 `nativeModelContextBehavior: 'patch'`**：仍 mirror 到 native，照样崩溃。
- **默认 `forcePolyfill: false`**：漏改一处即整页崩溃；拒绝。
