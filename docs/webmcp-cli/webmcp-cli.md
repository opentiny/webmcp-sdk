# CLI 使用指南

## 概述

`@opentiny/webmcp-cli` 是一个命令行工具，能帮你用命令控制 Chrome 浏览器。你告诉它"打开某个网页"，它就会自动打开 Chrome、注入一套 AI 能用的工具，让 AI 像人一样操作网页——点击按钮、填写表单、滚动页面。

简单说：**它把任何网页变成 AI 可以遥控的"提线木偶"**。

## 适用场景

假设你想让 AI 帮你在百度搜索、在掘金发文章、在 Excalidraw 画图。传统做法是修改网站源码，但百度的代码你改不了。

`webmcp-cli` 换了个思路——不改网站代码，而是在页面加载时自动注入一套操作工具（叫 `page-agent-tool`）。AI 通过命令行调用这套工具，就能点击、输入、滚动，就像人在操作一样。

它还内置了一些网站的专属工具（比如百度的搜索工具、掘金的发文章工具），用起来比模拟鼠标更可靠。

## 安装

```bash
# 全局安装（发布后）
npm install -g @opentiny/webmcp-cli
# 或
pnpm add -g @opentiny/webmcp-cli

# 本地开发联调（在项目 packages/webmcp-cli 目录下）
npm run build
# 或
pnpm build

# 本地全局安装，确保可在终端直接使用 webmcp-cli 软链接
npm install -g .
# 或
pnpm link --global
```

安装后在终端输入 `webmcp-cli` 就能用了。

## 命令一览

`webmcp-cli` 只有 5 个命令，很好记：

| 命令 | 干什么用的 | 例子 |
| :--- | :--- | :--- |
| `tabs open <url>` | 打开一个网页 | `webmcp-cli tabs open "https://baidu.com"` |
| `tabs close <tabid>` | 关掉某个标签页 | `webmcp-cli tabs close ABC123` |
| `tabs switch <tabid>` | 切到某个标签页 | `webmcp-cli tabs switch ABC123` |
| `tabs back` / `forward` | 后退 / 前进 | `webmcp-cli tabs back` |
| `state` | 看看浏览器现在啥情况 | `webmcp-cli state` |
| `state -t <tabid>` | 看指定标签页的情况 | `webmcp-cli state -t ABC123` |
| `run <工具名> '<参数>'` | 让页面执行某个操作 | `webmcp-cli run page-agent-tool '{"action":"click","index":5}'` |
| `clipboard <内容>` | 把内容复制到剪贴板 | `webmcp-cli clipboard "hello"` |
| `watch` | 常驻监听页签并自动注入（一般由 CLI 自动拉起） | `webmcp-cli watch` |

**全局参数**：`-w, --workspace <路径>` 指定浏览器用户数据目录（默认 `~/.webmcp_chrome_profile`）。好处是多次打开 Chrome 能共享 Cookie 和登录状态，不用重复登录。

## 命令详解

### tabs —— 管理标签页

跟你在浏览器里操作标签页一样，只不过用命令行：

```bash
# 打开网页（自动注入 AI 操作工具）
webmcp-cli tabs open "https://github.com/opentiny/tiny-vue"

# 关闭指定标签页（tabid 从 state 命令获取）
webmcp-cli tabs close <tabid>

# 切到指定标签页
webmcp-cli tabs switch <tabid>

# 后退 / 前进（不传 tabid 就操作当前页）
webmcp-cli tabs back
webmcp-cli tabs forward
```

### state —— 查看浏览器状态

`state` 告诉你当前浏览器的状态：打开了哪些标签页、当前页面的 URL 和标题、页面上有哪些工具可以用。

> [!IMPORTANT]
> `state` **不返回页面内容**（DOM 元素）。它只告诉你"页面上有哪些工具可用"。要获取页面上的按钮、输入框等具体元素，需要用下面的 `run page-agent-tool` 命令。

```bash
webmcp-cli state
```

返回长这样：

```json
{
  "url": "https://www.baidu.com/",
  "title": "百度一下，你就知道",
  "activeTabid": "2EA73ED323E46E5E108D4E46DA4E4AA7",
  "webmcpTools": [
    { "name": "page-agent-tool" },
    { "name": "baidu_search" }
  ],
  "tabs": [
    { "tabid": "2EA73ED3...", "title": "百度一下", "url": "https://www.baidu.com/" }
  ]
}
```

- **`url` / `title`**：当前页面的网址和标题
- **`webmcpTools`**：这个页面上可用的工具列表。每个页面都会有 `page-agent-tool`，某些网站还有专属工具
- **`tabs`**：所有打开的标签页，每个有个唯一 ID（`tabid`），操作指定标签页时要用
- **`activeTabid`**：当前活跃标签页的 ID

> [!TIP]
> 如果 `webmcpTools` 里有 `system-overview` 工具，一定要先调用一次它。它的返回值会告诉你这个网站的模块、路由、页面工具和使用规范，对后续操作很有帮助。

### run —— 执行页面工具

`run` 是最核心的命令——让页面上的某个工具执行操作。

```bash
webmcp-cli run <工具名> '<JSON 参数>' [-t tabid]
```

**JSON 参数的引号规则**（不同终端不一样，踩坑重灾区）：

| 终端 | 写法 | 例子 |
| :--- | :--- | :--- |
| **Bash**（推荐） | 单引号包裹，里面正常双引号 | `'{"action": "click", "index": 5}'` |
| **CMD** | 双引号包裹，里面的双引号要转义 | `"{\"action\": \"click\", \"index\": 5}"` |
| **PowerShell** | 单引号包裹，里面正常双引号 | `'{"action": "click", "index": 5}'` |

> [!WARNING]
> 如果控制台报错 `参数不是有效的 JSON`，99% 是引号格式不对。对照上面的表检查一下。

**从文件读取参数**：如果参数很长（比如文章正文），可以用 `-f` 从文件读取：

```bash
webmcp-cli run create_article -f ./article-args.json
```

也可以在 JSON 里用占位符引用文件内容：

```bash
# 直接读取文件文本
webmcp-cli run create_article '{"title":"标题","content":"@file:./article.md"}'

# 读取文件并 Base64 编码（某些平台需要）
webmcp-cli run create_article '{"title":"标题","content":"@base64file:./article.md"}'
```

## page-agent-tool 内置动作

每个页面都会自动注入一个叫 `page-agent-tool` 的工具。它是 AI 操作网页的核心，支持 7 种动作：

| 动作 | 干什么 | 关键参数 |
| :--- | :--- | :--- |
| `browserState` | 获取页面的完整结构（无障碍树） | `responseMode`: `full`/`diff`/`both` |
| `searchTree` | **按关键词搜索**页面元素，只返回匹配结果 | `query`（搜索词）、`contextLines`、`maxMatches` |
| `click` | 点击某个元素 | `index`（元素编号） |
| `fill` | 在输入框里填文字 | `index`、`text` |
| `select` | 选择下拉框选项 | `index`、`value` |
| `scroll` | 滚动页面 | `down`(是否向下)、`numPages`(滚几页) |
| `executeJavascript` | 在页面里执行 JavaScript 代码 | `code`（JS 代码） |

### responseMode：控制返回内容的多少

`page-agent-tool` 有个 `responseMode` 参数，控制操作后返回多少页面信息：

- **`diff`**（默认）：只返回发生变化的部分，省 Token
- **`full`**：返回完整的页面结构树
- **`both`**：变化部分和完整树都返回

执行 `click`、`fill` 等操作后，工具会自动返回最新的页面状态（默认 `diff`），**不需要再手动调一次 `browserState`**。

```bash
# 首次获取完整页面结构
webmcp-cli run page-agent-tool '{"action": "browserState", "responseMode": "full"}'

# 点击后自动返回变化部分
webmcp-cli run page-agent-tool '{"action": "click", "index": 18}'
```

## 元素检视（Cursor 式）

注入成功后，页面会出现常驻悬浮按钮（默认可在右下角）：

| 状态 | 外观 | 含义 |
| :--- | :--- | :--- |
| 受控（默认） | 深色 **WebMCP** + 绿色圆点 | 页面已由 `webmcp-cli` 注入，可正常浏览 |
| 检视中 | 蓝色 **检视中** + 闪烁圆点 | 已拦截 hover/click，可点选元素 |

浮钮支持**拖动**调整位置；点右侧 **×** 可关闭（收成迷你 **W** 入口，再点即可展开）。位置与关闭状态保存在当前页 `sessionStorage`。

> 首次通过任意 `webmcp-cli` 命令连上浏览器后，会自动拉起后台 `watch` 进程：之后在该 Chrome 里**新开页签或导航**也会自动注入，不必再手动执行一次 `state`/`run` 才出现浮钮。可用 `WEBMCP_NO_WATCHER=1` 关闭此行为。**对应浏览器关闭后，watch 会随 CDP 断开自动退出**（并有探活兜底），不会无限空挂。

| 操作 | 说明 |
| :--- | :--- |
| **点击浮钮主体** | 进入或退出检视（主入口） |
| **拖动浮钮** | 任意放置，避免遮挡内容 |
| **× 关闭** | 收起为迷你 **W**；点击 **W** 再展开 |
| **Esc** | 仅退出检视，浮钮仍保留 |
| **Cmd/Ctrl+Shift+C** | 次要快捷键，与浮钮等效 |
| Hover | 蓝色边框 + 标签（如 `div`） |
| Click | 选中并**立即复制** Cursor 元数据；标签显示「已复制」，toast 提示 |
| 剪贴板内容 | Cursor 元素卡片：`ELEMENT` / `PATH` / `ATTRIBUTES` / `COMPUTED STYLES` / `POSITION & SIZE` / `INNER TEXT` |

将上述内容粘贴到外部 AI 对话框并附上修改意见后，AI 应直接据此改**本地源码**（无需再调 `inspect-element`；该工具已移除）。

开发态也可在业务代码中直接使用：

```ts
import { enableInspectAssist } from '@opentiny/next-sdk'
enableInspectAssist() // 或 enableInspectAssist({ brandLabel: 'WebMCP' })
```

### 页面结构格式

`browserState` 返回的是一棵"无障碍树"（Accessibility Tree），格式是 YAML，长这样：

```yaml
- region:
    - main:
        - button #9 [cursor=pointer] "产品文档"
        - button #47 [selected] [cursor=pointer] "40元/月 2核CPU 2GB内存"
        - radio #53 [checked] [cursor=pointer] "自动生成密码"
        - button #74 [cursor=pointer] "立即购买"
```

**每个节点**：`- 角色 #编号 [状态标记] "名称"`

- **角色**：button（按钮）、link（链接）、textbox（输入框）、heading（标题）等
- **`#编号`**：可交互元素的唯一编号，操作时把它传给 `index` 参数。**只有带 `#编号` 的元素才能操作**
- **`[状态标记]`**：`[checked]`（已勾选）、`[selected]`（已选中）、`[disabled]`（不可用）等
- **`"名称"`**：元素的文字描述
- **缩进**：表示父子层级关系

> [!WARNING]
> **每次操作后编号会变！** 点击一个按钮后，页面刷新，之前的 `#9` 可能变成了 `#12`。所以每次操作前都要重新获取页面状态，不能沿用旧编号。

### searchTree：按需搜索元素

如果页面上有几百个元素，全量获取会消耗大量 Token。`searchTree` 可以按关键词搜索，只返回匹配的部分。

> 就像用 Ctrl+F 搜索文件，而不是打开整个文件夹翻找。

**搜索维度**（都是对 `query` 字符串做包含匹配）：

| 搜索目标 | query 示例 | 说明 |
| :--- | :--- | :--- |
| 按元素类型 | `button`、`link`、`textbox` | 找特定角色的元素 |
| 按元素名称 | `提交`、`立即购买` | 找名称包含该文字的元素 |
| 按状态 | `checked`、`disabled` | 找特定状态的元素 |
| 按编号 | `#5` | 精确定位某个已知编号 |

```bash
# 搜索所有按钮
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "button"}'

# 搜索包含"登录"的元素
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "登录"}'

# 搜索指定编号的元素，上下文各 1 行
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "#42", "contextLines": 1}'
```

> [!TIP]
> **searchTree 优先原则**：已知要找什么元素时，优先用 `searchTree` 搜索，找不到再用 `browserState` 获取全量树。Token 消耗能减少 80% 以上。

## 领域专用工具

除了万能的 `page-agent-tool`，CLI 还为常见网站内置了专属工具。访问对应域名时自动注入，比模拟鼠标操作更可靠。

| 网站域名 | 注入的工具 | 说明 |
| :--- | :--- | :--- |
| `excalidraw.com` | `excalidraw_execute_command` | 用 JSON 直接操作白板元素 |
| `juejin.cn` | `create_article`、`publish_current_draft`、`get_article_info` | 掘金文章创建与发布 |
| `www.baidu.com` | `baidu_search`、`baidu_get_results` | 百度搜索与结果获取 |
| `editor.csdn.net` | `create_article` | CSDN 文章创建 |
| `xiaohongshu.com` | `xhs_get_note_detail`、`xhs_get_feed`、`xhs_search_notes` | 小红书内容获取 |
| `creator.xiaohongshu.com` | `xhs_publish_note` | 小红书笔记发布 |
| `segmentfault.com` | `segmentfault_publish_article` | 思否文章发布 |

> [!TIP]
> 有专属工具时优先用专属工具。比如在 Excalidraw 画图，直接调 `excalidraw_execute_command` 添加一个矩形，比模拟鼠标拖拽画图成功率高得多。

每个领域工具有详细的使用说明，写在 `packages/webmcp-cli-skill/domains/` 目录下的子技能文档中。

想贡献新的领域工具？在 `packages/webmcp-cli/webmcp-tools/` 下创建域名的文件夹（包含 `index.ts` 和 `meta.ts`），重新构建即可自动发现并注入。

## 工作原理

用一句话概括：**CLI 启动一个独立 Chrome，每次打开页面时自动注入操作工具，AI 通过命令调用这些工具来操控页面。**

1. **启动浏览器**：CLI 探测本地 `9222` 调试端口，没有就启动一个 Chrome。用独立的用户目录，跟你日常浏览器隔离，但 Cookie 和登录状态可以保留
2. **注入工具**：每次页面加载好（`DOMReady`）时，CLI 自动注入 `page-agent-tool` 和 WebMCP 运行环境。对于有专属工具的网站，还会注入对应的领域工具
3. **命令转发**：AI 调用 `run` 命令时，CLI 通过 CDP 协议把请求转发到页面内执行，拿到结果后返回给 AI

---

- 想让 AI Agent 通过 Skill 接入 → 看 [Skill 使用指南](./webmcp-cli-skill)
- 想了解浏览器插件版 → 看 [快速入门](../ai-extension/install)
