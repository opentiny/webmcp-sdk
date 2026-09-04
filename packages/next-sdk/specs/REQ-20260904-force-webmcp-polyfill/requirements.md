# Spec：强制 JS Polyfill 覆盖 Chromium 实验性 modelContext

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联 Issue：（无强制 Issue）

## 背景

最新 Chromium（Origin Trial，约 149–156）在 `Document` 上提供了原生 `modelContext`（C++ / Mojo）。`@mcp-b/webmcp-polyfill`（仓库当前 3.0.0，上游最新 5.1.0）**故意不覆盖已存在的 native**：`initializeWebMCPPolyfill()` 见 native 即 no-op，且 `forceOverride` 已从上游删除。

一旦页面走到原生 `getTools()` / `registerTool()`，渲染进程可能被 `bad_message::ReceivedBadMessage` 强杀（`RESULT_CODE_KILLED_BAD_MESSAGE`）。next-sdk 的 remoter builtin 路径、`getBuiltinMcpTools`、`waitForRouteTools`、page-agent 注册都会调用这些方法，表现为「页面一开就崩溃」。

因此 SDK 必须在调用 polyfill **之前**自行摘掉 native（含 `navigator.modelContext` 别名，否则 polyfill 会把 native 再挂回 `document`），并暴露 `forcePolyfill` 供确认原生可用后关闭。

## 领域术语表

- **native modelContext**：浏览器 C++ 绑定的 `document.modelContext` / `navigator.modelContext`，无 `__isWebMCPPolyfill`。
- **JS polyfill**：`@mcp-b/webmcp-polyfill` 的 `StrictWebMCPContext`，对象上带 `__isWebMCPPolyfill === true`。
- **forcePolyfill**：SDK 在初始化前屏蔽 native，促使 polyfill 安装受控的纯 JS 实现。

## 目标用户 / 场景

- 使用 `initializeBuiltinWebMCP()` / `registerPageAgentTool()` 的站点（含 doc-ai、webmcp-cli 注入脚本）。
- 在已开启 WebMCP Origin Trial 的 Chrome 中打开页面，不应因 `getTools()` 杀进程。
- 少数需要验证原生 WebMCP 的集成方，可显式 `{ forcePolyfill: false }`。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/initialize-builtin-WebMCP.ts`
- `node_modules/@mcp-b/webmcp-polyfill`：native 存在则 skip；仅有 `navigator.modelContext` 时会把它挂到 `document`
- `packages/webmcp-cli/src/inject/page-init.ts`：当前直调 `initializeWebMCPPolyfill()`，会绕过 SDK 防护
- [Kiwop：Chrome 150/151 WebMCP 崩溃](https://www.kiwop.com/en/blog/webmcp-chrome-150-crash-google-remote-experiment)
- 上游 `@mcp-b/webmcp-polyfill@5.1.0` 仍无 force override，且改为装在 `Document.prototype`；SDK 必须在初始化后把 polyfill 实例挂回 `document`（见 design）

## 范围

### In Scope

- `initializeBuiltinWebMCP(options?)` 增加 `forcePolyfill?: boolean`，**默认 `true`**。
- 默认路径：若当前 context 不是 polyfill，则影子化 `document.modelContext` 与 `navigator.modelContext`，再调用 `initializeWebMCPPolyfill()`。
- `registerPageAgentTool()` 继续无参调用初始化，自动享受默认强制 polyfill。
- `webmcp-cli` 页面注入改为走 `initializeBuiltinWebMCP` / `registerPageAgentTool`，不再直调 polyfill。
- 用户文档与类型导出。
- catalog 将 `@mcp-b/webmcp-polyfill` / `@mcp-b/webmcp-types` 升到 **5.1.0**，降低后续大版本跳跃成本。

### Out of Scope

- 改 `@mcp-b/global` 或 Chrome 原生 C++。
- 在业务示例（如 `doc-ai` `App.vue`）里各自 `defineProperty`。
- 运行期从 polyfill 再切回 native（需刷新页面）。

## 用户故事与验收标准

1. 作为站点开发者，我希望默认初始化后 `getTools()` 走 JS polyfill，以便在最新 Chrome 打开页面不崩溃。
   - 验收：document/navigator 上预先存在无 `__isWebMCPPolyfill` 的伪 native；`initializeBuiltinWebMCP()` 后 context 带 `__isWebMCPPolyfill`，且未调用伪 native 的 `getTools`。
2. 作为集成方，我希望只清 `document.modelContext` 时也不会被 polyfill 把 `navigator.modelContext` 接回来。
   - 验收：仅 navigator 上有伪 native 时，初始化后 document 上的 context 仍是 polyfill，不是该 native 对象。
3. 作为需要验证原生 API 的开发者，我希望能关闭强制 polyfill。
   - 验收：`initializeBuiltinWebMCP({ forcePolyfill: false })` 保留已有非 polyfill context。
4. 作为 webmcp-cli 注入的页面，我希望与 SDK 同一套防护。
   - 验收：`page-init.ts` 不再直接 `initializeWebMCPPolyfill()`；`registerPageAgentTool` 内部初始化即可。

## 非功能要求

- 影子化失败（不可配置属性）时 catch，不抛；若 `forcePolyfill: true` 结束后仍不是 polyfill，则 `console.warn`。
- 不读取/调用 native `getTools` / `registerTool`（仅读属性并检查 marker）。
- 幂等：已是 polyfill 时再次调用不得拆掉现有 JS context。
- jsdom 单测可验证；不在本 Spec 要求实机 Chromium E2E。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/global-tools.md` 已更新 `forcePolyfill`
- [x] `pnpm -F @opentiny/next-sdk test` 通过
