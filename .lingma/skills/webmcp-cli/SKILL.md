---
name: webmcp-cli
description: >-
  通过 webmcp-cli 操控真实 Chrome 窗口：查询页面状态、点击/填写/下拉选择、调用页面
  navigator.modelContext 工具、管理标签页。面向 AI Agent 调用，命令输出结构化 JSON。
  在执行 run 或打开新标签后必须先 list。适用于 Chrome 远程调试、WebMCP 页面自动化、
  page-agent 交互场景。
---

# webmcp-cli 浏览器自动化技能

通过全局命令 **`webmcp-cli`** 连接本机 Chrome（CDP 端口 `9523`），向当前活动标签页注入 WebMCP 与 PageController 脚本，并以 **JSON** 形式返回结果。stderr 为进度/错误信息，**stdout 仅为可解析的 JSON**，调用方应只解析 stdout。

## 适用场景

当需要操作**真实的 Chrome 窗口**时，可以使用此工具，比如：检查当前页面的状态，点击，填写或下拉选择数据，或者调用网页上的 Webmcp API 定义的工具，以及浏览器标签的打开，关闭和切换。

## 受众与输出

此命令工具是优先提供给 **AI Agent** 去调用，而非人类用户。每个命令都会返回结构化的数据。

解析约定：

- 成功：stdout 为 `JSON` 对象或数组（`list`、各 `run` 子命令均如此）
- 失败：进程非零退出，错误信息在 stderr
- 不要在 stdout 中混入自然语言说明

## 强制工作流（必须遵守）

1. **在执行行动前，务必优先调用 `list` 命令**，以查询当前浏览器的状态，才能执行后续 `run` 命令。
2. **打开新标签后，务必优先调用 `list` 命令**（`run tabs open` 之后必须再 `list`，以获取新标签的 `tabId`、可交互元素索引与 `tools` 列表）。

推荐循环：

```text
list → 分析 currTab.content / tools / otherTabs → run <action> → list（验证状态变化）
```

切换标签（`run tabs switch`）或关闭标签后，也应重新 `list` 再操作页面。

## 安装

```bash
npm install -g @opentiny/webmcp-cli
# 或仓库内: cd packages/webmcp-cli && pnpm build && pnpm link:global
```

命令名：`webmcp-cli`。CLI 会自动尝试启动带远程调试的 Chrome；若未安装或启动失败，stderr 会提示用户处理。

## 命令速查

### `webmcp-cli list`

注入页面脚本（幂等：`window.__webmcpcli_init` 已存在则跳过重复注入），收集当前活动标签状态。

**返回 JSON 结构：**

```json
{
  "currTab": {
    "url": "当前页面 URL",
    "content": "PageController.getBrowserState() 结果，含可交互元素索引",
    "tabId": "当前标签 targetId",
    "tools": "页面 navigator.modelContext 注册的工具列表"
  },
  "otherTabs": [{ "url": "", "title": "", "tabId": "" }]
}
```

从 `content` 中读取元素 **`index`**，供 `page-agent click/fill/select` 使用。从 `tools` 中确认可执行的 **modelContext 工具名** 与参数 schema。

### `webmcp-cli run` — 三类子命令

#### 1. 页面 WebMCP 工具（modelContext）

执行当前页 `navigator.modelContext` 注册的工具（通过 testing API 调用）：

```bash
webmcp-cli run <toolName> [参数...]
```

示例：`webmcp-cli run change-color #110000`（单参数工具可将剩余 argv 合并为一个参数值）。

**必须先 `list`** 确认 `currTab.tools` 中存在该 `toolName` 及 `inputSchema`。

#### 2. page-agent 页面操作

```bash
webmcp-cli run page-agent browserState
webmcp-cli run page-agent click <index>      # index 可写 35 或 #35
webmcp-cli run page-agent fill <index> <text>
webmcp-cli run page-agent select <index> <text>
```

| 子命令 | 说明 |
|--------|------|
| `browserState` | 查询页面标题、URL、HTML 及可交互元素状态 |
| `click` | 按元素索引点击 |
| `fill` | 按索引填写文本 |
| `select` | 按索引选择下拉选项 |

元素索引来自最近一次 **`list` 的 `currTab.content`**，不要凭猜测使用索引。

#### 3. tabs 标签页管理

```bash
webmcp-cli run tabs open <url>
webmcp-cli run tabs close <tabId>
webmcp-cli run tabs switch <tabId>
```

`tabId` 来自 **`list` 的 `currTab.tabId` 或 `otherTabs[].tabId`**。`open` 返回 `{ action, tabId, url }`，**之后必须再执行 `list`**。

## Agent 决策指南

| 目标 | 推荐步骤 |
|------|----------|
| 了解页面能做什么 | `list` → 读 `content` + `tools` |
| 点击按钮 / 填表 | `list` → `run page-agent click/fill/select` → `list` 验证 |
| 调用业务自定义 MCP 工具 | `list` → `run <toolName> ...` |
| 打开新页面 | `run tabs open <url>` → **`list`** → 再 page-agent / modelContext |
| 多标签协作 | `list` 看 `otherTabs` → `run tabs switch <tabId>` → **`list`** |

## 常见错误

- 跳过 `list` 直接 `run`：索引或 `tabId` 可能过期，导致点击失败或找不到标签。
- `open` 后未 `list`：不知道新标签是否已成为活动页，也不知道最新 DOM 索引。
- 在错误标签上操作：先 `tabs switch` 再 `list`，再 `page-agent`。
- 将 stderr 当作结果解析：只解析 stdout JSON。

## 页面注入说明（供理解，无需手动执行）

`list` 注入逻辑包括：`initializeWebMCPPolyfill()`、`PageController`（`window.__webmcpcli_pageController`）、以及通过 `registerToolsChangedCallback` 维护的 `window.__webmcpcli_tools`。已注入时设置 `window.__webmcpcli_init = true` 避免重复注入。

## 更多参考

- 命令与示例详见包内 [README.md](../../README.md)
- 源码：`packages/webmcp-cli/src/commands/`
