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

## 核心架构特性

- **后台浏览器驻留**：如果当前没有开启带有调试端口 (`9222`) 的 Chrome，CLI 会自动在后台拉起一个基于你本地 Profile 的独立 Chrome 实例。
- **自动环境注入**：当获取页面状态时，CLI 会自动探测并向页面注入 `webmcp-polyfill` 以及内置的 `page-agent-tool` 工具。
- **统一工具协议**：采用标准 MCP (Model Context Protocol) 规范。所有的页面操作（点击、输入等）不再是生硬的命令，而是直接调用页面上注册好的 `page-agent-tool`。

## CLI 命令使用

全局命令为 **`webmcp-cli`**，支持全局参数：
- `-w, --workspace <path>`: 指定自定义的浏览器工作空间（用户配置目录）路径。如果不传默认使用 `~/.webmcp_chrome_profile`。

---

### 1. `state` 命令

获取浏览器当前活跃页签（或指定页签）的详细状态，包括当前页面的标题、URL、页面中包含的可操作 DOM 树，以及当前页面所有可调用的 MCP 工具列表（包含自动注入的 `page-agent-tool`）。

**用法：**
```bash
webmcp-cli state
webmcp-cli state -t <tabid>
```

**返回格式（JSON）：**
```json
{
  "content": "浏览器状态：包含 [index]<type>text</type> 格式的页面树...",
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
      "tabid": 1234,
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
假设网页使用 `navigator.modelContext.registerTool` 注册了一个名为 `change-color` 的工具：
```bash
webmcp-cli run change-color '{"color": "#ff0000"}'
```

**示例二：使用内置的 `page-agent-tool` 操控浏览器**
CLI 自动注入的 `page-agent-tool` 支持丰富的动作（action）：`browserState`, `click`, `fill`, `select`, `scroll`, `executeJavascript`。

获取状态（执行前必须调用一次）：
```bash
webmcp-cli run page-agent-tool '{"action": "browserState"}'
```

点击索引为 35 的元素：
```bash
webmcp-cli run page-agent-tool '{"action": "click", "index": 35}'
```

向索引为 40 的输入框填入文本：
```bash
webmcp-cli run page-agent-tool '{"action": "fill", "index": 40, "text": "OpenTiny"}'
```

---

### 3. `open` 命令

在浏览器中打开指定的网页，并且可以选择是在当前页签导航，还是开启全新页签。

**用法：**
```bash
webmcp-cli open <url>
webmcp-cli open <url> -t <tabid>
webmcp-cli open <url> -n    # 在新页签中打开
```

**示例：**
```bash
webmcp-cli open "https://github.com/opentiny/tiny-vue" -n
```
