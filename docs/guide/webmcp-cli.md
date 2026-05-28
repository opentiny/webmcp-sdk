# WebMCP CLI 工具介绍

`@opentiny/webmcp-cli` 是一个用于控制本地 Chrome 浏览器并暴露 WebMCP 接口的命令行工具。它基于 `puppeteer-core`，通过 CDP（Chrome DevTools Protocol）连接或启动本地浏览器，支持自动为当前网页注入 WebMCP 运行环境及页面感知与操控工具（`page-agent-tool`），从而让 AI Agent 可以以极低的侵入性、低成本感知和操控任何网页。

---

## 🌟 核心价值

传统的 WebMCP 开发需要修改前端应用代码，利用 `initializeBuiltinWebMCP()` 和 `navigator.modelContext.registerTool()` 在应用内手动注册工具。

然而，在面对非己方开发、或无法修改源码的第三方网站（如搜索引擎、数据看板等）时，直接改造是无法实现的。**`webmcp-cli` 解决了这一难题**：
- **无侵入注入**：只需通过命令行打开目标网页，CLI 会自动向页面中注入 `webmcp-polyfill` 和操作感知工具 `page-agent-tool`。
- **让任何网页“可被 AI 调用”**：无需重构任何代码，即可将任意网站瞬间包装为符合 MCP 标准规范的服务端。
- **自动化桥接**：自动维持跨页签、多 iframe、路由变化等情况下的 WebMCP 运行环境和消息转发。
- **协同共建内置工具库**：开发者和社区可以通过在 `packages/webmcp-cli/webmcp-tools` 目录下编写并贡献定制的特定领域页面工具（例如专属的交互动作、数据抓取工具等），共同扩展 CLI 的开箱即用能力。

---

## 🚀 安装与开发

你可以通过以下两种方式安装 `webmcp-cli`：

### 1. 全局安装（正式发布后）
```bash
npm install -g @opentiny/webmcp-cli
# 或
pnpm add -g @opentiny/webmcp-cli
```

### 2. Monorepo 本地联调（推荐开发人员）
在项目根目录下编译并全局链接：
```bash
# 进入 CLI 目录
cd packages/webmcp-cli

# 执行构建
pnpm build

# 本地全局安装，确保可在终端直接使用 webmcp-cli 软链接
npm install -g .
```

---

## 💻 命令行指令详解

全局命令为 `webmcp-cli`。

### 全局参数
- `-w, --workspace <path>`：指定自定义的浏览器工作空间（用户配置目录 User Data Dir）。若不指定，默认使用 `~/.webmcp_chrome_profile`。这允许 CLI 在多次启动间保留您的登录状态和个人数据。

### 1. `tabs` 子命令 —— 管理浏览器标签页与导航

`webmcp-cli` 通过 `tabs` 子命令提供了对浏览器标签页生命周期与历史导航的完整控制。

#### 打开新网页
在新标签页中打开指定的 URL 并自动注入 WebMCP 运行环境。
**用法：**
```bash
webmcp-cli tabs open <url>
```
**示例：**
```bash
webmcp-cli tabs open "https://github.com/opentiny/tiny-vue"
```

#### 关闭标签页
关闭指定页签 ID（通过 `state` 命令获取的 UUID）的标签页。
**用法：**
```bash
webmcp-cli tabs close <tabid>
```

#### 切换活跃标签页
激活并强制将浏览器视角切换到指定的标签页。
**用法：**
```bash
webmcp-cli tabs switch <tabid>
```

#### 标签页导航控制（前进/后退）
对指定标签页（不传则默认当前标签页）进行后退或前进一步的导航。
**用法：**
```bash
# 后退一步
webmcp-cli tabs back [tabid]

# 前进一步
webmcp-cli tabs forward [tabid]
```

---

### 2. `state` 命令 —— 感知当前页面的状态与工具
获取当前活动页签（或指定页签）的详细状态，包括当前页面的标题、URL、可操作 DOM 树，以及当前页面所有可调用的 MCP 工具列表。

> [!IMPORTANT]
> 每次执行页面动作（如 `click`、`fill`、`select`）前，AI Agent **必须**先调用 `state` 命令获取最新的 DOM 索引及环境状态，以防止操作发生偏差。

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
      "description": "浏览器内置的操作工具，支持 click, fill 等动作...",
      "inputSchema": { ... }
    }
  ],
  "tabs": [
    {
      "tabid": "B0C4FD0208F0B84F3FAC58122C6EE667",
      "title": "Example Domain",
      "url": "https://example.com"
    }
  ]
}
```

- **`content`**：一段对人类和 AI 高度友好的 DOM 简化树。仅带有数字索引（如 `[18]`）的元素才是可交互的。缩进（`\t`）代表了 DOM 的层级与父子关系。
- **`webmcpTools`**：该页面当前暴露出来的所有 MCP 工具接口。除了自动注入的 `page-agent-tool` 之外，如果网页本身注册了自定义工具，也会并列返回。
- **`tabs`**：当前浏览器所有打开的页签及其 UUID `tabid`。你可以将特定的 `tabid` 传递给 `-t` 参数来操控指定的后台页签。

### 3. `run` 命令 —— 调用并执行网页 MCP 工具
向指定的浏览器页签下发执行指令。工具名与参数必须与 `state` 命令中所列的 `webmcpTools` 清单匹配。

**用法：**
```bash
webmcp-cli run <toolName> <argsJson> [-t tabid]
```

**示例一：使用内置的 `page-agent-tool` 操控浏览器**
这是最常用的场景，AI 代理通过它来自动操作页面：
```bash
# 获取状态（一切操作的先决条件）
webmcp-cli run page-agent-tool '{"action": "browserState"}'

# 点击索引为 35 的按钮
webmcp-cli run page-agent-tool '{"action": "click", "index": 35}'

# 向索引为 40 的输入框中填充内容
webmcp-cli run page-agent-tool '{"action": "fill", "index": 40, "text": "OpenTiny WebMCP"}'

# 向下滚动 1 页
webmcp-cli run page-agent-tool '{"action": "scroll", "down": true, "numPages": 1}'
```

**示例二：执行页面自带的自定义工具**
如果目标网页本身通过 WebMCP SDK 注册了特定工具，例如 `change-theme`：
```bash
webmcp-cli run change-theme '{"theme": "dark"}'
```

---

## 🛠️ 底层工作原理简析

`webmcp-cli` 的高效运作源自其创新的后台架构与双向桥接机制：

1. **后台浏览器驻留与接管**：
   CLI 启动时会探测本地 `9222` 调试端口。如果浏览器未启动，则以 headless/headful 模式拉起一个 Chrome 实例。由于使用了指定的工作空间（Workspace），它与用户日常使用的浏览器相互隔离，且多次运行能够共享 Cookie 与 LocalStorage，从而避免了重复登录。
   
2. **Puppeteer + CDP 双层探测**：
   CLI 并非简单地模拟输入，而是通过 CDP 协议实时监听浏览器的 `targetcreated`、`targetinfochanged` 等生命周期事件。

3. **双向代理桥接（MessageBridge）**：
   当用户使用 `state` 或 `run` 命令时，CLI 会在 Puppeteer 侧和目标页面的 JS Context 间建立一个通信桥梁。如果是未经改造的普通页面，CLI 将会在每次页面就绪（`DOMReady`）时瞬间执行环境注入，并将原本暴露在页面内的 WebMCP Server 路由给 CLI 侧，由 CLI 接收请求、解析动作并在真机浏览器上触发动作后返回结果。
