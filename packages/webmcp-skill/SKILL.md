---
name: webmcp-skill
description: 面向第三方 AI Agent 的安装与执行指南：如何使用 webmcp-cli 与浏览器页面交互。包含已注入 WebMCP 工具的页面领域专用工具说明。
license: MIT
metadata:
  author: opentiny
  version: '1.1.0'
---

# WebMCP CLI Skill

本 Skill 为第三方 AI Agent 提供完整说明，介绍如何通过 Model Context Protocol（MCP）使用 `webmcp-cli` 与浏览器页面交互。

## 何时使用

- 需要与网页交互（点击元素、填写表单、滚动页面）时。
- 需要读取当前 DOM 结构并识别可交互元素时。
- 在已注入领域专用工具的页面上操作时（例如 Excalidraw 绘图工具）。

## 安装

**本地 Monorepo：**

```bash
cd packages/webmcp-cli && pnpm link --global
```

**NPM：**

```bash
npm install -g @opentiny/webmcp-cli
```

---

## 命令

### `webmcp-cli tabs`

管理浏览器标签页。

```bash
webmcp-cli tabs open https://excalidraw.com    # 打开新网页
webmcp-cli tabs close <tabid>                  # 关闭指定标签页
webmcp-cli tabs switch <tabid>                 # 切换到指定标签页
webmcp-cli tabs back                           # 当前标签页后退
webmcp-cli tabs back <tabid>                   # 指定标签页后退
webmcp-cli tabs forward                        # 当前标签页前进
webmcp-cli tabs forward <tabid>                # 指定标签页前进
```

`tabs` 会影响当前浏览器的实时状态，它 **不会** 返回当前页面的可交互元素索引和 `webmcpTools` 列表。所以 每一个`tabs` 命令执行完毕后，**必须立即再调用一次** `webmcp-cli state`，才能获取新页面的 DOM 内容与可用页面工具。

### `webmcp-cli state`

返回当前浏览器的 **完整状态**：URL、标题、可交互元素索引（`content`）、已注入的 MCP 工具列表（`webmcpTools`）及已打开标签页（`tabs`）。这是操作页面前的唯一可靠信息来源。

```bash
webmcp-cli state
webmcp-cli state -t <targetId>   # target a specific tab by its real Chrome target ID
```

**输出示例：**

```json
{
  "content": "[0]<a>新闻 />\n[13]<textarea placeholder=搜索 />\n[18]<button>百度一下</button>",
  "url": "https://www.baidu.com/",
  "title": "百度一下，你就知道",
  "webmcpTools": [{ "name": "page-agent-tool" }, { "name": "baidu_search" }],
  "tabs": [
    { "tabid": "2EA73ED323E46E5E108D4E46DA4E4AA7", "title": "百度一下，你就知道", "url": "https://www.baidu.com/" }
  ]
}
```

> `tabid` 是 **真实的 Chrome target ID**（UUID）。配合 `-t` 可指定某个标签页。

#### 何时必须调用 state

| 时机                  | 是否必须先 `state` | 说明                                                                                |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| 执行 `tabs open` 之前 | 否                 | `tabs open` 是唯一可在未先 `state` 的情况下直接执行的命令                           |
| 执行 `tabs` 之后      | **是**             | 新页面加载并注入工具后，须用 `state` 获取新页面的 `content` 与 `webmcpTools`        |
| 执行 `run` 之前       | **是**             | 元素索引与页面内容会随操作变化，须先拿到最新状态再调用 `page-agent-tool` 或其它工具 |
| 连续多次 `run` 之间   | **是**             | 每次 `run` 可能改变 DOM（跳转、弹窗、列表刷新等），下一步操作前须再次 `state`       |

**推荐工作流：**

```text
webmcp-cli tabs open <url>  # 打开页面（无需先 state）
webmcp-cli state            # tabs open 之后必调：获取新页面内容与工具
webmcp-cli run ...        # 基于 state 返回的索引/工具执行操作
webmcp-cli state          # run 之后若继续操作，再次 state
webmcp-cli run ...
```

执行 `page-agent-tool`（点击、填写、滚动等）时，**必须** 依据 `state` 输出中的 `content` 字段确定元素 `index`，切勿沿用过期索引。`state` 也是确认当前页面有哪些 `webmcpTools`（含领域专用工具）的唯一方式。

### `webmcp-cli run <tool-name> '<json-args>'`

在当前活动页面上执行 MCP 工具。

```bash
# Click element at index 18
webmcp-cli run page-agent-tool '{"action": "click", "index": 18}'

# Fill text into input at index 13
webmcp-cli run page-agent-tool '{"action": "fill", "index": 13, "text": "Hello"}'

# Scroll the page
webmcp-cli run page-agent-tool '{"action": "scroll", "down": true, "numPages": 1}'

# Execute JavaScript
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "document.title"}'

# Target a specific tab
webmcp-cli run page-agent-tool '{"action": "browserState"}' -t <targetId>
```

---

## 领域专用工具

当 `webmcp-cli tabs open` 导航到特定域名时，除通用 `page-agent-tool` 外还会自动注入专用工具。请查看 `state` 输出中的 `webmcpTools` 以确认可用工具。

| 域名             | 注入的工具                          | 何时阅读子 Skill                                                                                                             |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `excalidraw.com` | `excalidraw_execute_command`        | **当当前页面 URL 包含 `excalidraw.com` 且需要绘制或操作画布元素时，请阅读 [domains/excalidraw.md](domains/excalidraw.md)。** |
| `juejin.cn`      | 通用工具 / `page-agent-tool`         | **当需要在掘金平台发布文章、填充内容或操作编辑器时，请阅读 [domains/publish-article.md](domains/publish-article.md)。** |
| `www.baidu.com`  | `baidu_search`, `baidu_get_results` | 无需子 Skill；工具的描述已能说明用途。                                                                                       |

### 何时阅读 `domains/excalidraw.md`

若满足以下 **任一** 条件，请阅读 [domains/excalidraw.md](domains/excalidraw.md)：

- 用户要求你在 Excalidraw 上绘制图表、流程图、架构图或任意可视化内容。
- 当前页面 URL 为 `excalidraw.com`，且 `webmcpTools` 中包含 `excalidraw_execute_command`。
- 需要在 Excalidraw 画布上新增、更新、删除或查询元素。

---

## 核心约束

1. **state 优先：** 除 `tabs open` 外，执行任何其它命令前必须先调用 `webmcp-cli state`；`tabs open` 之后也必须再调用一次 `state`。切勿猜测元素索引或工具列表——`state` 是查询浏览器完整状态的唯一入口。
2. **合法 JSON：** 将 JSON 参数用单引号包裹：`'{"action": ...}'`。
3. **标签页定位：** 使用 `state` 输出中的 UUID 格式 `tabid`，配合 `-t` 指定标签页。
4. **领域工具：** 若存在领域专用工具，应优先于 `page-agent-tool` 使用——它们对该域名的交互更可靠。
