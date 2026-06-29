---
name: webmcp-cli-skill
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

用户环境通常都已经安装好 `webmcp-cli` 工具，当shell终端提示找不到工具时，才进行下面的安装：

```bash
npm install -g @opentiny/webmcp-cli
```

## 命令

### 1. 管理浏览器标签页 `webmcp-cli tabs`

所有子级命令如下：

```bash
webmcp-cli tabs open https://excalidraw.com    # 打开新网页
webmcp-cli tabs close <tabid>                  # 关闭指定标�### 2. 查询浏览器当前状态 `webmcp-cli state`

它返回当前浏览器的**导航元数据**（url、title、activeTabid、webmcpTools、所有已打开页签），是确认当前页面有哪些可用工具（`webmcpTools`）的唯一方式。

> **注意**：`state` 不返回页面 DOM 内容（没有 `content` 字段）。需要获取可交互元素或页面信息状态时，请显式调用 `page-agent-tool` 的 `browserState` 或 `searchTree` 动作。

```bash
webmcp-cli state
webmcp-cli state -t <targetId>   # target a specific tab by its real Chrome target ID
```

**输出示例：**

```json
{
  "url": "https://www.baidu.com/",
  "title": "百度一下，你就知道",
  "activeTabid": "2EA73ED323E46E5E108D4E46DA4E4AA7",
  "webmcpTools": [{ "name": "page-agent-tool" }, { "name": "baidu_search" }],
  "tabs": [
    { "tabid": "2EA73ED323E46E5E108D4E46DA4E4AA7", "title": "百度一下,你就知道", "url": "https://www.baidu.com/" }
  ]
}
```

返回值中， `tabs` 属性值是浏览器当前打开的全部标签页的信息，其它属性为当前激活页面的URL、标题、已注入的 MCP 工具列表（`webmcpTools`）。

> `tabid` 是 **真实的 Chrome target ID**（UUID）。配合 `-t` 可指定某个标签页。

`webmcpTools`的值的数组中如果有 `system-overview`的工具，并且在本轮对话中，该域名下没有调用过它，那么一定要立即执行一下 。`system-overview`工具的返回值能指导后续的操作，比如会包含网站的`模块 & 路由 & 页面工具 &使用规范`等等内容。

```bash
webmcp-cli run system-overview '{}'
```

#### 何时必须调用 state

| 时机                  | 是否必须先 `state` | 说明                                                                                |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| 执行 `tabs open` 之前 | 否                 | `tabs open` 是唯一可在未先 `state` 的情况下直接执行的命令                           |
| 执行 `tabs` 之后      | **是**             | 新页面加载并注入工具后，须用 `state` 获取新页面的 `webmcpTools`                     |
| 执行 `run` 之前       | **是**             | 须先通过 `state` 确认工具列表，再用 `browserState` 或 `searchTree` 获取页面可交互元素 |
| 连续多次 `run` 之间   | 视情况             | 若需重新确认工具列表或当前页面，才需再次 `state`；仅获取 DOM 变化直接使用 `page-agent-tool` 相关 action 即可 |

**推荐工作流：**

```text
webmcp-cli tabs open <url>  # 打开页面（无需先 state）
webmcp-cli state            # 获取 url/title/webmcpTools/tabs 导航元数据
webmcp-cli run page-agent-tool '{"action": "browserState", "responseMode": "full"}'
                            # 获取完整 DOM 元素索引，或者使用 searchTree 进行过滤搜索
webmcp-cli run ...          # 基于返回的元素索引/工具执行操作（例如 click, fill）
```

执行 `page-agent-tool`（点击、填写、滚动等）时，**必须** 依据 `browserState` 或 `searchTree` 返回的元素索引确定元素 `index`，切勿沿用过期索引。`state` 是确认当前页面有哪些 `webmcpTools`（含领域专用工具）的唯一方式，获取页面状态必须调用 `browserState` 或 `searchTree`。


### 3. 执行页面上的工具 `webmcp-cli run <tool-name> '<json-args>'`

在当前活动页面上执行 MCP 工具， `json-args` 要提前转义为有效的cli参数。

## 调用规范

该工具可以在多种终端下运行，但优先使用 `bash` shell 来运行。
不同终端传入 `json-args` 参数时，请严格依照下面规则传入：

- bash终端： 使用单引号包裹`json-args` , eg. '{"action": "fill", "index": 0, "text": "你的幽默风趣技术标题"}'
- cmd终端： 使用双引号包裹`json-args`, 且里面的双引号需要转义， eg. "{\"action\": \"fill\", \"index\": 0, \"text\":\"你的幽默风趣技术标题\"}"
- powershell 终端： 使用单引号包裹`json-args`, 且里面的双引号需要转义， eg. `{\"action\": \"fill\", \"index\": 0, \"text\":\"你的幽默风趣技术标题\"}'

在遇到控制台报错： `executing run command: 参数不是有效的 JSON`时， 一定要检查`json-args` 参数的格式是否符合上面的规则。

### 3.1 `page-agent-tool`

它是一个自动化操作网页的工具，每一个页面都会存在，可以直接调用，它支持以下动作：

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

#### 3.1.1 `searchTree`：按关键词精准搜索无障碍树（优先使用）

> 与业界 AI 编辑器（Cursor / Windsurf / Copilot）**按需读取文件**的策略完全一致：
> 不要每次都拉取全量的无障碍树（等价于把整个项目代码全部发给模型），
> 而是**先用关键词搜索定位**，只把命中行及上下文发给模型，节省 80%+ 的 token。

**决策流程（请严格遵循）：**

```
已知要找的元素类型或名称？
    ↓ 是
    → 先用 searchTree 搜索
        ↓ 找到了？
            是 → 直接使用命中的 #N 索引操作
            否 → 再用 browserState(full) 获取全量树兜底
    ↓ 否（完全不知道页面有什么）
    → 用 browserState(full) 获取完整树
```

**支持的搜索维度（均对同一个 query 字符串做包含匹配）：**

| 搜索目标 | 示例 query | 说明 |
|---------|-----------|------|
| 按 role 类型 | `button` / `link` / `heading` / `textbox` | 查找特定角色的节点 |
| 按元素名称 | `提交` / `下一步` / `立即购买` | 查找 accessible name 含该文本的节点 |
| 按状态 | `checked` / `disabled` / `expanded` | 查找特定状态的节点 |
| 按 ref 索引 | `#5` | 精确定位某个已知 ref |

**参数：**

- `query`（必填）：搜索关键词
- `contextLines`（可选，默认 2）：每个命中行前后保留的上下文行数
- `maxMatches`（可选，默认 20）：最多返回的分组数，防止结果过多

**示例：**

```bash
# 查找页面上所有按钮
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "button"}'

# 查找名称含"提交"的节点（上下文 3 行）
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "提交", "contextLines": 3}'

# 查找所有已勾选的复选框
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "checked"}'

# 精确定位 ref #42
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "#42", "contextLines": 1}'
```

**输出示例：**

```
无障碍树搜索结果 — 关键词: "button" | 总行数: 182 | 命中: 4 行 | 返回分组: 1

── 分组 1（第 159–171 行）──
    159 | - generic #132 [cursor=pointer]
    160 | - link #133 [cursor=pointer]
>>>  161 |   - button #134 [cursor=pointer] "立即购买"
    162 | - link #135 [cursor=pointer] "计费说明"
>>>  165 | - button #138 [cursor=pointer] "立即购买"

提示：如需操作命中元素，使用其 #N 索引；如需查看完整树，请使用 browserState。
```

`>>>` 标注的行是命中行，其余是上下文。拿到 `#N` 后直接传给 `click` / `fill` 等动作。

---

#### 3.2 领域专用工具

当 `webmcp-cli tabs open` 导航到特定域名时，或者使用`webmcp-cli state` 查询浏览器时，会自动注入该域名下的专用工具，以实现当前域名下的专用功能。

请查看 `webmcp-cli state` 输出中的 `webmcpTools` 以确认网页的可用工具。

| 需要注入的域名            | 注入的工具                                                | 何时阅读子 Skill                                                                                                                            |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `excalidraw.com`          | `excalidraw_execute_command`                              | **当当前页面 URL 包含 `excalidraw.com` 且需要绘制或操作画布元素时，请阅读 [domains/excalidraw.md](domains/excalidraw.md)。**                |
| `juejin.cn`               | `create_article`                                          | **当需要在掘金平台发布文章、填充内容或操作编辑器时，请阅读 [domains/publish-article-in-juejin.md](domains/publish-article-in-juejin.md)。** |
| `www.baidu.com`           | `baidu_search`, `baidu_get_results`                       | 无需子 Skill；工具的描述已能说明用途。                                                                                                      |
| `my.oschina.net/`         | `create_article`                                          | **当需要在开源中国平台发布文章时，请阅读 [domains/publish-article-in-oschina.md](domains/publish-article-in-juejin.md)。**                  |
| `xiaohongshu.com`         | `xhs_get_note_detail`, `xhs_get_feed`, `xhs_search_notes` | 无需子 Skill；工具的描述已能说明用途。                                                                                                      |
| `creator.xiaohongshu.com` | `xhs_publish_note`                                        | 无需子 Skill；工具的描述已能说明用途。                                                                                                      |
| `editor.csdn.net`         | `create_article`                                          | **当需要在 CSDN 平台发布文章、填充内容或操作编辑器时，请阅读 [domains/publish-article-in-csdn.md](domains/publish-article-in-csdn.md)。**   |

在各自的域名中，可以调用相应的网页工具：

```bash
# 在excalidraw网页中，获取画布元素
webmcp-cli run excalidraw_execute_command '{"eventName": "getSceneElements"}'

# 在掘金上发布新文章的工具
webmcp-cli run create_article '{"title": "文章标题", "content": "文章的正文的base64编码"}'

# 在 CSDN 上填写新文章（需先关闭模版库弹窗，见 publish-article-in-csdn.md）
webmcp-cli run create_article '{"title": "文章标题", "content": "文章的正文的base64编码"}'

# 搜索小红书笔记（自动触发滚动加载）
webmcp-cli run xhs_search_notes '{"keyword": "AI Agent", "limit": 10}'

# 小红书发布图文笔记
webmcp-cli run xhs_publish_note '{"title": "第一条笔记", "content": "内容极其精彩...", "images": [{"name": "1.jpg", "mimeType": "image/jpeg", "base64": "..."}]}'
```

### 何时阅读 `domains/excalidraw.md`

若满足以下 **任一** 条件，请阅读 [domains/excalidraw.md](domains/excalidraw.md)：

- 用户要求你在 Excalidraw 上绘制图表、流程图、架构图或任意可视化内容。
- 当前页面 URL 为 `excalidraw.com`，且 `webmcpTools` 中包含 `excalidraw_execute_command`。
- 需要在 Excalidraw 画布上新增、更新、删除或查询元素。

---

## 核心约束

1. **searchTree 优先：** 已知目标元素类型或名称时，**必须优先使用 `searchTree`** 而非直接拉取全量树。这与业界 AI 编辑器按需读文件的策略完全一致——先搜索定位，找不到再兜底全量。
2. **state 优先：** 除 `tabs open` 外，执行任何其它命令前必须先调用 `webmcp-cli state`；`tabs open` 之后也必须再调用一次 `state`。切勿猜测元素索引或工具列表——`state` 是查询浏览器完整状态的唯一入口。
3. **合法 JSON：** 将 JSON 参数用单引号包裹：`'{"action": ...}'`。
4. **标签页定位：** 使用 `state` 输出中的 UUID 格式 `tabid`，配合 `-t` 指定标签页。`tabs open` / `tabs switch` 返回的 `tabid` 应在后续所有 `run` 命令中复用；`state` 也会返回当前操作页的 `activeTabid`。
5. **领域工具：** 若存在领域专用工具，应优先于 `page-agent-tool` 使用——它们对该域名的交互更可靠。
6. **调用网页工具:** 严格按照终端的类型，传入相应的`json-args` 参数
