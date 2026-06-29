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
| `get_article_info` | 在编辑器中获取当前草稿的标题 and 正文 | 无 |
| `publish_current_draft` | 在编辑器中自动填写分类、标签和摘要并发布文章 | `category`（分类）、`tag`（标签）、`summary`（必填，由 AI 总结的 50~100 字摘要） |

---

## 连续发布流程

现在的流程中，新创建的文章在填写完毕后可直接通过工具进行智能分析并一键发布，无需经过人工审核或返回草稿箱。

### 第一步：打开编辑器

使用 `state` 检查当前标签。如果未打开掘金编辑器，先导航过去：

```bash
webmcp-cli tabs open "https://juejin.cn/editor/drafts/new?v=2"
webmcp-cli state
```

> [!IMPORTANT]
> **标签页定位（必读）**
>
> 1. `tabs open` 会返回 `tabid`，后续 `run` 建议始终带上 `-t <tabid>`，避免命令打到错误的标签页（例如浏览器默认首页）。
> 2. 掘金打开 `/new?v=2` 后，填写标题时会**自动跳转**为 `/editor/drafts/{id}` 草稿 URL——这是正常现象，`create_article` 在两种 URL 下均可工作。
> 3. 无参工具（如 `get_article_info`）可直接运行：`webmcp-cli run get_article_info` 或 `webmcp-cli run get_article_info '{}'`
> 4. 发布前务必 `tabs switch` 到含文章内容的编辑器标签页，再执行 `publish_current_draft`。

### 第二步：填写标题和正文

将文章内容写入 `.md` 文件后，通过 `@base64file:` 内联引用传入。**请使用上一步返回的 tabid**：

```bash
# TAB_ID 来自 tabs open 的返回值
webmcp-cli run create_article -t TAB_ID '{"title":"你的文章标题","content":"@base64file:./article.md"}'
```

> [!WARNING]
> - `title` 不能含有特殊引号等字符，否则 CLI 的 JSON 解析会失败
> - `@base64file:` 占位符会被 CLI 自动展开为 Base64 编码内容，无需手动处理

如果需要传 JSON 文件（高级用法）：

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

### 第三步：使用内置工具一键发布

在编辑器页面内容填写完成后，直接使用注入该域名的 `publish_current_draft` 内置 MCP 工具一键完成分类、标签选择并点击发布。

> [!IMPORTANT]
> - **切勿盲目使用默认值（"前端" 和 "Vue.js"）**！
> - 在运行发布工具前，AI 必须先调用 `get_article_info` 工具获取当前文章的标题和正文内容。
> - AI 需要基于获取的文章内容智能推断并选择最合适的 `category`（分类）与 `tag`（标签），并**自主总结出一段字数在 50 到 100 字之间的文章摘要**，将该摘要传入 `summary` 字段。
> - **注意：传入的摘要字数必须严格在 50-100 字以内，否则发布工具将会报错并停止发布！**

```bash
# 1. 获取当前文章信息（无参数时可省略 '{}'）
webmcp-cli run get_article_info -t TAB_ID

# 2. 智能推断和总结摘要后，执行一键发布（必须在编辑器标签页上）
webmcp-cli run publish_current_draft -t TAB_ID '{"category":"开发工具","tag":"AI Agent","summary":"本指南详细介绍了如何使用 WebMCP 让 AI 助手精准操控浏览器，涵盖了安装配置、核心工具集的使用方法以及多种实际应用场景，是一篇极具实用价值的 AI Agent 实战教程。"}'
```
