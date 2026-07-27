# @opentiny/webmcp-cli

`@opentiny/webmcp-cli` 是一个用于控制 Chrome 浏览器并暴露 WebMCP 接口的 CLI 工具。它基于 `puppeteer-core`，通过 CDP（Chrome DevTools Protocol）连接或启动本地浏览器，支持自动为页面注入 WebMCP 运行环境及页面操作工具 (`page-agent-tool`)，从而让 AI Agent 可以轻松感知和操控网页。

## 安装与开发

```bash
# 全局安装（发布后）
npm install -g @opentiny/webmcp-cli
# 或
pnpm add -g @opentiny/webmcp-cli

# 本地联调（在 packages/webmcp-cli 目录）
pnpm build
npm install -g .
```

> **注意：** 在本地联调时，建议使用 `npm install -g .`，这会确保在你的 PATH 中生成有效的可执行文件（`webmcp-cli`）。

## 测试

统一使用 [Vitest](https://vitest.dev/)（与 `@opentiny/next-sdk` 一致）：

```bash
# 单元测试（无浏览器依赖，已接入根目录 pnpm test）
pnpm test

# 浏览器 E2E（需本机 Chrome/Edge，或设置 CHROME_PATH；默认 headless）
pnpm build:webmcp-cli
pnpm test:browser
```

CI 中浏览器任务使用 [browser-actions/setup-chrome](https://github.com/browser-actions/setup-chrome) 安装 Chrome，并通过 `CHROME_PATH` + `WEBMCP_HEADLESS=1` 启动。

---

## 核心架构特性

- **后台浏览器驻留**：如果当前没有开启带有调试端口 (`9222`) 的 Chrome，CLI 会自动在后台拉起一个基于你本地 Profile 的独立 Chrome 实例。
- **自动环境注入**：当获取页面状态时，CLI 会自动探测并向页面注入 `webmcp-polyfill` 以及内置的 `page-agent-tool` 工具；同时会拉起后台 `watch` 守护进程，在新开页签 / 导航时自动注入（无需再手动执行一次命令才出现浮钮）。**浏览器（CDP）关闭后 watch 会自动退出**，下次 CLI 再连时重新拉起。
- **统一工具协议**：采用标准 MCP (Model Context Protocol) 规范。所有的页面操作（点击、输入等）不再是生硬的命令，而是直接调用页面上注册好的 `page-agent-tool`。
- **元素检视（Inspect Assist）**：注入后常驻可拖动「WebMCP」浮钮；点选即复制 Cursor 元素卡片（`ELEMENT` / `PATH` / `ATTRIBUTES` / …，能力来自 `@opentiny/next-sdk` 的 `enableInspectAssist`）。

## CLI 命令使用

全局命令为 **`webmcp-cli`**，支持全局参数：
- `-w, --workspace <path>`: 指定自定义的浏览器工作空间（用户配置目录）路径。如果不传默认使用 `~/.webmcp_chrome_profile`。

---

### 1. `state` 命令

获取浏览器当前活跃页签（或指定页签）的**导航元数据**，包括当前页面的标题、URL、浏览器所有已打开的页签列表，以及当前页面已注入的 MCP 工具列表（`webmcpTools`）。

> **注意**：`state` 不再返回页面 DOM 内容（`content`）。若需要读取页面可交互元素，请在 `state` 之后显式调用 `page-agent-tool` 的 `browserState` action。

**用法：**
```bash
webmcp-cli state
webmcp-cli state -t <tabid>
```

**返回格式（JSON）：**
```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "webmcpTools": [
    {
      "name": "page-agent-tool",
      "description": "...",
      "inputSchema": "..."
    }
  ],
  "tabs": [
    {
      "tabid": "2EA73ED323E46E5E108D4E46DA4E4AA7",
      "title": "Example Domain",
      "url": "https://example.com"
    }
  ]
}
```

---

### 2. `run` 命令

向指定页签调用并执行任意的 WebMCP 工具。工具名与参数须与 `state` 命令中获取到的 `webmcpTools` 清单匹配。

**用法：**
```bash
webmcp-cli run <toolName> <argsJson> [-t tabid]
```

**示例一：执行页面自带工具**
假设网页使用 `document.modelContext.registerTool` 注册了一个名为 `change-color` 的工具：
```bash
webmcp-cli run change-color '{"color": "#ff0000"}'
```

**示例二：使用内置的 `page-agent-tool` 操控浏览器**
CLI 自动注入的 `page-agent-tool` 支持丰富的动作（action）：`browserState`, `click`, `fill`, `select`, `scroll`, `executeJavascript`。

此外，该工具接收配置参数 **`responseMode`**，用于控制返回的页面状态形式：
- **`diff`**（默认）：仅返回自上一次状态以来的增量 DOM 差异。
- **`full`**：返回当前视口中完整的语义化 ARIA YAML 树。
- **`both`**：同时返回全量树和增量差异。

在执行 `click`, `fill`, `select`, `scroll` 等操作后，工具默认会自动以指定的 `responseMode`（默认 `diff`）返回最新的页面状态，使你可以立即检测操作效果，无须再次手动调用 `browserState`。

获取状态（全量模式）：
```bash
webmcp-cli run page-agent-tool '{"action": "browserState", "responseMode": "full"}'
```

获取状态（仅增量差异模式，默认）：
```bash
webmcp-cli run page-agent-tool '{"action": "browserState", "responseMode": "diff"}'
```

点击索引为 35 的元素（动作执行完自动返回增量）：
```bash
webmcp-cli run page-agent-tool '{"action": "click", "index": 35}'
```

向索引为 40 的输入框填入文本（动作执行完自动返回增量）：
```bash
webmcp-cli run page-agent-tool '{"action": "fill", "index": 40, "text": "OpenTiny"}'
```

---

### 3. `tabs` 命令

管理浏览器标签页。

**用法：**
```bash
webmcp-cli tabs open <url>         # 在新标签页打开网页
webmcp-cli tabs close <tabid>      # 关闭指定标签页
webmcp-cli tabs switch <tabid>     # 切换到指定标签页
webmcp-cli tabs back [tabid]       # 后退（默认当前标签页）
webmcp-cli tabs forward [tabid]    # 前进（默认当前标签页）
```

**示例：**
```bash
webmcp-cli tabs open "https://github.com/opentiny/tiny-vue"
webmcp-cli tabs switch 2EA73ED323E46E5E108D4E46DA4E4AA7
webmcp-cli tabs back
```
