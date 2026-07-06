---
name: webmcp-cli-skill
description: 面向第三方 AI Agent 的安装与执行指南：如何使用 webmcp-cli 与浏览器页面交互。包含已注入 WebMCP 工具的页面领域专用工具说明。
license: MIT
metadata:
  author: opentiny
  version: '1.2.0'
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
webmcp-cli tabs close <tabid>                  # 关闭指定标签页
webmcp-cli tabs switch <tabid>                 # 切换到指定标签页
webmcp-cli tabs back                           # 当前标签页后退
webmcp-cli tabs back <tabid>                   # 指定标签页后退
webmcp-cli tabs forward                        # 当前标签页前进
webmcp-cli tabs forward <tabid>                # 指定标签页前进
```

### 2. 查询浏览器当前状态 `webmcp-cli state`

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

| 时机                  | 是否必须先 `state` | 说明                                                                                                         |
| --------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ |
| 执行 `tabs open` 之前 | 否                 | `tabs open` 是唯一可在未先 `state` 的情况下直接执行的命令                                                    |
| 执行 `tabs` 之后      | **是**             | 新页面加载并注入工具后，须用 `state` 获取新页面的 `webmcpTools`                                              |
| 执行 `run` 之前       | **是**             | 须先通过 `state` 确认工具列表，再用 `browserState` 或 `searchTree` 获取页面可交互元素                        |
| 连续多次 `run` 之间   | 视情况             | 若需重新确认工具列表或当前页面，才需再次 `state`；仅获取 DOM 变化直接使用 `page-agent-tool` 相关 action 即可 |

**推荐工作流：**

1. **打开页面**：使用 `tabs open` 命令导航到目标 URL。
2. **确认状态**：使用 `state` 获取导航元数据，确认 `webmcpTools` 是否注入完毕。
3. **获取页面信息**：这是与页面交互**最关键的一步**！由于 `state` 不包含 DOM 内容，你必须通过 `page-agent-tool` 来获取页面的可交互元素。**请根据实际情况自主思考并选择获取方式**：
   - **方式 A（按需搜索）**：如果你明确知道要寻找的元素特征（例如“登录”按钮），**优先使用** `searchTree` 以节省大量上下文 Token。
     `webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "登录"}'`
   - **方式 B（全量获取）**：如果你需要全面了解页面结构，或者不知道页面上具体有什么元素，请使用 `browserState` 抓取完整的无障碍树。
     `webmcp-cli run page-agent-tool '{"action": "browserState", "responseMode": "full"}'`
4. **执行交互**：拿到上一步返回的元素索引（`index`）后，再执行 `click`、`fill` 等具体操作。

执行 `page-agent-tool` 操作（点击、填写、滚动等）时，**必须** 依据 `browserState` 或 `searchTree` 返回的元素索引确定元素 `index`，切勿沿用过期猜测的索引。

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

它是一个自动化操作网页的工具，每一个页面都会存在，可以直接调用。支持以下动作（`action`）：
`browserState`、`searchTree`、`click`、`fill`、`select`、`scroll`、`executeJavascript`。

此外，该工具接收配置参数 **`responseMode`**，用于控制操作后返回的页面状态形式：

- **`diff`**（默认）：仅返回自上一次状态以来的增量 DOM 差异，极大节省 Token。
- **`full`**：返回当前视口中完整的语义化 ARIA YAML 树。
- **`both`**：同时返回全量树和增量差异。

执行 `click`、`fill`、`select`、`scroll` 等操作后，工具会自动以指定 `responseMode`（默认 `diff`）返回最新页面状态，**无须再次手动调用 `browserState`**。

#### 示例：

```bash
# 1. 首次获取全量页面状态
webmcp-cli run page-agent-tool '{"action": "browserState", "responseMode": "full"}'

# 2. 点击索引为 18 的元素，自动返回 diff
webmcp-cli run page-agent-tool '{"action": "click", "index": 18}'

# 3. 填充文本框
webmcp-cli run page-agent-tool '{"action": "fill", "index": 13, "text": "Hello"}'

# 4. 选择下拉框选项
webmcp-cli run page-agent-tool '{"action": "select", "index": 7, "value": "option_value"}'

# 5. 滚动页面，同时获取全量与增量
webmcp-cli run page-agent-tool '{"action": "scroll", "down": true, "numPages": 1, "responseMode": "both"}'

# 6. 执行 JavaScript
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "document.title"}'

# 7. 对指定标签页操作
webmcp-cli run page-agent-tool '{"action": "browserState"}' -t <targetId>
```

#### 3.1.1 Browser State：页面无障碍树格式说明

`browserState` 返回当前页面的语义化 YAML 无障碍树，格式如下：

```yaml
- region:
    - main:
        - button #9 [cursor=pointer] "产品文档"
        - button #47 [selected] [cursor=pointer] "40元/月 2核CPU 2GB内存"
        - radio #53 [checked] [cursor=pointer] "自动生成密码"
        - button #74 [cursor=pointer] "立即购买"
        - generic #6 [cf-uba="serviceList..Flexus云服务"] "Flexus云服务"
```

**节点格式**：`- role #N [token1] [token2] "accessible name"`

| 字段              | 说明                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| `role`            | ARIA 语义角色（button / link / radio / heading / listitem / generic 等）             |
| `#N`              | 可交互元素的唯一操作索引，**只有带 `#N` 的节点才能被操作**，操作时将 N 作为 `index` 参数传入 |
| `[token]`         | 可选 token：状态标记（`[checked]` `[selected]` `[disabled]` `[cursor=pointer]`）或定制属性（`[cf-uba="..."]`） |
| `"accessible name"` | 元素的语义化名称，**用双引号包裹**（通过 aria-label / aria-labelledby / innerText 等计算得出）；无名称节点此字段省略 |
| 缩进              | 表示父子关系                                                                           |

> ⚠️ **每次操作后 `#N` 索引会重新分配，不要复用旧索引。**

#### 3.1.2 Browser State Diff：增量差异格式说明

执行交互操作后，工具默认返回增量差异（Diff）以减少 Token 消耗：

```diff
- button #9 "产品文档"
+ button #9 "产品文档 (已点击)"
```

或者当页面结构发生改变时，会展示新增或移除的节点差异。优先阅读 Diff 以快速确认操作是否生效；仅当 Diff 不足以支持下一步决策时，再显式调用 `browserState(full)`。

#### 3.1.3 `searchTree`：按关键词精准搜索无障碍树（优先使用）

> 与业界 AI 编辑器（Cursor / Windsurf）**按需读取文件**的策略完全一致——
> **先精准搜索，再按需拉取全量**，将发送给模型的 token 降至最低。

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

| 搜索目标     | 示例 query                                | 说明                                |
| ------------ | ----------------------------------------- | ----------------------------------- |
| 按 role 类型 | `button` / `link` / `heading` / `textbox` | 查找特定角色的节点                  |
| 按元素名称   | `提交` / `下一步` / `立即购买`            | 查找 accessible name 含该文本的节点 |
| 按状态       | `checked` / `disabled` / `expanded`       | 查找特定状态的节点                  |
| 按 ref 索引  | `#5`                                      | 精确定位某个已知 ref                |

**参数：**

- `query`（必填）：搜索关键词
- `contextLines`（可选，默认 2）：每个命中行前后保留的上下文行数
- `maxMatches`（可选，默认 20）：最多返回的分组数，防止结果过多

**示例：**

```bash
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "button"}'
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "提交", "contextLines": 3}'
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "checked"}'
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

#### 3.1.4 页面状态获取四原则

1. **按关键词精准搜索（最高优先级）**：已知要找的元素类型或名称时，**优先使用 `searchTree`**，token 消耗比全量树减少 80%+。
2. **首次获取全量**：首次进入页面、页面发生重大刷新、或 `searchTree` 无法找到所需信息时，调用 `browserState` 并指定 `responseMode` 为 `full` 或 `both`。
3. **增量优先**：执行 `click`、`fill`、`select`、`scroll` 操作后，工具默认自动返回 `diff` 增量信息，优先阅读这些 Diff 以快速确认操作是否生效。
4. **按需拉取全量**：如果增量 Diff 不足以支持下一步操作，或需要寻找不在 Diff 中的 `#N` 节点，且 `searchTree` 也无法定位时，再显式调用 `browserState` 拉取完整树。

#### 3.1.5 Browser Rules（操作约束）

在使用 `page-agent-tool` 与网页交互时，严格遵守以下规则：

- **仅与具有 `#N` 索引的元素进行交互**，将 N 作为 `index` 参数传入，仅使用明确出现在树中的索引。
- **每次操作后 `#N` 索引会重新分配**，不要使用旧索引。
- 操作后分析返回的 Diff，判断是否需要与新出现的元素交互（如从下拉列表中选择选项）。
- 默认仅列出**可见视口**中的元素；若需要交互的元素在屏幕外，先使用 `scroll` 操作滚动。可用 `numPages` 参数控制滚动幅度（0.5 = 半页，2.0 = 两页）。
- 如果出现**验证码**，告知用户无法自动解决，请用户手动处理后再继续。
- 如果缺少预期元素，尝试滚动或导航后退。
- **不要重复同一操作超过 3 次**，除非有明确的条件变化。
- 如果向输入框填充文本后操作被中断（如弹出下拉建议），说明页面状态已变化，需先处理新出现的元素。
- 如果 `<user_request>` 包含具体筛选条件（产品类型、价格、位置等），优先应用过滤器提高效率。
- 如果向输入框填写文本，可能需要按回车、点击搜索按钮或从下拉列表中选择才能完成操作。
- **不要在无凭据的情况下尝试登录**。

#### 3.1.6 Capability（能力边界）

- `page-agent-tool` **只能处理单页应用**，不要跳出当前页面。
- **不要点击 `target="_blank"` 的链接**（会在新窗口打开）；如需打开新页面，改用 `webmcp-cli tabs open`。
- 任务失败是可以接受的：
  - 用户的请求可能不可行、不适当，或缺少必要信息——此时告知用户并说明原因。
  - 网页可能存在 Bug，遇到阻塞时应及时告知用户当前页面的问题。
  - 来回重复操作可能导致副作用——**宁可失败告终，也不要盲目重试复杂流程**。
- 如果对当前网页或任务没有足够知识，**必须要求用户提供具体说明和详细步骤**。

#### 3.1.7 Task Completion Rules（任务结束条件）

在以下情况时必须结束任务：

1. 已完全完成用户请求。
2. 感到困惑或无法解决请求；或请求不清晰、包含不适当内容。
3. 绝对不可能继续（如缺少必要权限、验证码阻塞、目标元素不存在）。

---

#### 3.2 领域专用工具

当 `webmcp-cli tabs open` 导航到特定域名时，或者使用`webmcp-cli state` 查询浏览器时，会自动注入该域名下的专用工具，以实现当前域名下的专用功能。

请查看 `webmcp-cli state` 输出中的 `webmcpTools` 以确认网页的可用工具。

| 需要注入的域名            | 注入的工具                                                    | 何时阅读子 Skill                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `excalidraw.com`          | `excalidraw_execute_command`                                  | **当当前页面 URL 包含 `excalidraw.com` 且需要绘制或操作画布元素时，请阅读 [domains/excalidraw.md](domains/excalidraw.md)。**                                                                                                                                  |
| `juejin.cn`               | `create_article`, `publish_current_draft`, `get_article_info` | **当需要在掘金平台发布文章时，请阅读 [domains/publish-article-in-juejin.md](domains/publish-article-in-juejin.md)。**<br>注意：调用 `publish_current_draft` 前必须先生成严格在 **50-100 字** 内的文章摘要，否则工具将直接报错停止发布！ |
| `www.baidu.com`           | `baidu_search`, `baidu_get_results`                           | 无需子 Skill；工具的描述已能说明用途。                                                                                                                                                                                                                        |
| `my.oschina.net/`         | `create_article`, `get_article_info`, `publish_current_draft` | **当需要在开源中国平台发布文章时，请阅读 [domains/publish-article-in-oschina.md](domains/publish-article-in-oschina.md)。**<br>注意：调用 `publish_current_draft` 前须先 `get_article_info` 并生成 **50~200 字** 摘要。                                                                                                                                    |
| `xiaohongshu.com`         | `xhs_get_note_detail`, `xhs_get_feed`, `xhs_search_notes`     | 无需子 Skill；工具的描述已能说明用途。                                                                                                                                                                                                                        |
| `creator.xiaohongshu.com` | `xhs_publish_note`                                            | 无需子 Skill；工具的描述已能说明用途。                                                                                                                                                                                                                        |
| `editor.csdn.net`         | `create_article`, `get_article_info`, `publish_current_draft` | **当需要在 CSDN 平台发布文章时，请阅读 [domains/publish-article-in-csdn.md](domains/publish-article-in-csdn.md)。**<br>注意：调用 `publish_current_draft` 前须先 `get_article_info` 并生成 **100 字以内** 摘要。                                                                                                                     |
| `segmentfault.com`        | `create_article`, `get_article_info`, `publish_current_draft`, `segmentfault_publish_article` | **当需要在思否平台发布文章时，请阅读 [domains/publish-article-in-segmentfault.md](domains/publish-article-in-segmentfault.md)。** 推荐掘金风格三步流程；高级场景可用 `segmentfault_publish_article`。                                                                 |

在各自的域名中，可以调用相应的网页工具：

```bash
# 在excalidraw网页中，获取画布元素
webmcp-cli run excalidraw_execute_command '{"eventName": "getSceneElements"}'

# 在掘金上发布新文章
webmcp-cli run create_article '{"title": "文章标题", "content": "文章的正文的base64编码"}'

# 在 CSDN 上填写并发布（须先 get_article_info 推断分类/标签/摘要）
webmcp-cli run create_article '{"title": "文章标题", "content": "@base64file:./article.md"}'
webmcp-cli run get_article_info
webmcp-cli run publish_current_draft '{"category":"前端","tags":["Vue.js","JavaScript"],"summary":"100字以内的文章摘要..."}'

# 在开源中国上填写并发布
webmcp-cli run create_article '{"title": "文章标题", "content": "@base64file:./article.md"}'
webmcp-cli run publish_current_draft '{"category":"开源资讯","tags":["Vue.js","AI"],"summary":"50~200字的文章摘要..."}'

# 搜索小红书笔记（自动触发滚动加载）
webmcp-cli run xhs_search_notes '{"keyword": "AI Agent", "limit": 10}'

# 小红书发布图文笔记
webmcp-cli run xhs_publish_note '{"title": "第一条笔记", "content": "内容极其精彩...", "images": [{"name": "1.jpg", "mimeType": "image/jpeg", "base64": "..."}]}'

# 思否平台：掘金风格三步流程（推荐）
webmcp-cli run create_article '{"title": "你的文章标题", "content": "@base64file:./article.md"}'
webmcp-cli run get_article_info
webmcp-cli run publish_current_draft '{"category": "前端", "tags": ["前端", "AI", "WebMCP"]}'

# 思否高级流程（导航→过引导→填内容→保存草稿）
webmcp-cli run segmentfault_publish_article '{
  "action": "publish_full_flow",
  "title": "你的文章标题",
  "content": "# 正文\n\n文章内容...",
  "category": "前端",
  "tags": ["前端", "AI", "WebMCP"],
  "type": "original",
  "scope": "personal",
  "copyright": true,
  "scheduled_time": "2026-07-01T10:00:00+08:00"
}'

# 思否分步操作（精细控制）
webmcp-cli run segmentfault_publish_article '{"action": "set_title", "title": "文章标题"}'
webmcp-cli run segmentfault_publish_article '{"action": "set_scheduled_publish", "scheduled_time": "2026-07-01T10:00:00+08:00"}'
webmcp-cli run segmentfault_publish_article '{"action": "publish", "confirm": true}'
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
