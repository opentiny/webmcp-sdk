# 掘金 (Juejin) 文章发布指南

掘金文章编辑器网址：`https://juejin.cn/editor/drafts/new?v=2`

> [!IMPORTANT]
> 阅读本文档前，请先阅读通用指南中的 **"避坑准则"** 部分：[publish-article.md](./publish-article.md)

---

## 可用工具

掘金页面已注入以下 WebMCP 工具，直接调用即可完成操作，无需手动操作编辑器 DOM。

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `create_article` | 填写文章标题和正文 | `title`（标题字符串）、`content`（正文的 **Base64** 编码） |
| `get_article_info` | 在编辑器中获取当前草稿的标题和正文 | 无 |
| `publish_current_draft` | 在编辑器中自动填写分类、标签和摘要并发布文章 | `category`（分类）、`tag`（标签）、`summary`（必填，由 AI 总结的 50~100 字摘要） |

---

## 阶段一：创建草稿（人工审核前）

> [!IMPORTANT]
> 新文章**不要直接发布**，完成第二步后停止，等待人工审核。审核通过后再执行「阶段二」。

### 第一步：打开编辑器

使用 `state` 检查当前标签。如果未打开掘金编辑器，先导航过去：

```bash
webmcp-cli tabs open "https://juejin.cn/editor/drafts/new?v=2"
webmcp-cli state
```

### 第二步：填写标题和正文（完成后停止）

将文章内容写入 `.md` 文件后，通过 `@base64file:` 内联引用传入：

```bash
webmcp-cli run create_article '{"title":"你的文章标题","content":"@base64file:./article.md"}'
```

> [!WARNING]
> - `title` 不能含有特殊引号等字符，否则 CLI 的 JSON 解析会失败
> - `@base64file:` 占位符会被 CLI 自动展开为 Base64 编码内容，无需手动处理

**如果需要传 JSON 文件（高级用法）：**

```json
// article_args.json
{
  "title": "你的文章标题",
  "content": "<正文的Base64编码>"
}
```

```bash
webmcp-cli run create_article -f ./article_args.json
```

> [!NOTE]
> 执行完第二步后，文章会自动保存为草稿。**此时停止，通知用户进行人工审核。**
> 审核通过后，再执行下方「阶段二」流程进行批量发布。

---

## 阶段二：审核通过后批量发布

> [!IMPORTANT]
> 仅在用户确认人工审核通过后，才执行本阶段。

### 第一步：打开草稿箱

```bash
webmcp-cli tabs open "https://juejin.cn/creator/content/article/drafts"
webmcp-cli state
```

### 第二步：获取所有草稿列表

从 `state` 输出的 `content` 中找到所有草稿条目（通常是带文章标题的链接或按钮元素）。

```bash
# 用 JS 快速列出所有草稿标题和链接，便于确认
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "return Array.from(document.querySelectorAll(\".article-item-title, .title\")).map((e,i)=>i+\":\"+e.textContent.trim()).join(\"\\n\")"}'
```

### 第三步：逐个打开草稿并发布

对每篇草稿重复以下流程：

#### 3.1 点击进入草稿编辑页

从草稿箱列表中点击对应草稿，进入编辑器。由于掘金的草稿箱列表中草稿标题不是普通的 `a` 标签链接，而是通过 JavaScript 绑定自定义点击事件触发，可能在 `state` 的 `content` 中无法获取到该元素的交互索引 `[index]`。

**推荐做法：** 使用 `executeJavascript` 直接触发第一条或指定草稿的点击事件，这样最为稳定：

```bash
# 点击第一个草稿（索引为 0）
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "document.querySelectorAll(\".essays-container .essay-list .title\")[0].click()"}'
webmcp-cli state  # 等待新标签页编辑器加载完毕后刷新，并执行 tabs switch 到该编辑器标签
```

如果 `state` 中识别到了可点击索引，也可以通过常规方式点击：

```bash
# 根据 state 输出中的索引点击对应草稿标题
webmcp-cli run page-agent-tool '{"action": "click", "index": <草稿链接索引>}'
webmcp-cli state  # 等待编辑器加载完成，刷新 DOM
```

#### 3.2 使用内置工具发布文章

在编辑器页面加载完成后，无需通过 `page-agent-tool` 模拟各种输入框和下拉框点击，直接使用注入该域名的 `publish_current_draft` 内置 MCP 工具一键完成分类、标签选择并点击发布。

> [!IMPORTANT]
> - **切勿盲目使用默认值（"前端" 和 "Vue.js"）**！
> - 在运行发布工具前，AI 必须先调用 `get_article_info` 工具获取当前文章的标题和正文内容。
> - AI 需要基于获取的文章内容智能推断并选择最合适的 `category`（分类）与 `tag`（标签），并**自主总结出一段字数在 50 到 100 字之间的文章摘要**，将该摘要传入 `summary` 字段。

```bash
# 1. 获取当前文章信息
webmcp-cli run get_article_info

# 2. 智能推断和总结摘要后，执行一键发布
webmcp-cli run publish_current_draft '{"category":"开发工具","tag":"AI Agent","summary":"本指南详细介绍了如何使用 WebMCP 让 AI 助手精准操控浏览器，涵盖了安装配置、核心工具集的使用方法以及多种实际应用场景，是一篇极具实用价值的 AI Agent 实战教程。"}'
```

#### 3.3 返回草稿箱，处理下一篇

```bash
webmcp-cli tabs open "https://juejin.cn/creator/content/article/drafts"
webmcp-cli state  # 刷新草稿列表，继续下一篇
```

> [!NOTE]
> 重复 3.1 ~ 3.3，直到所有审核通过的草稿全部发布完毕。
