# 知乎 (Zhihu) 专栏文章发布指南

知乎专栏文章编辑器网址：`https://zhuanlan.zhihu.com/write`

> [!IMPORTANT]
> 阅读本文档前，请先阅读通用指南中的 **"避坑准则"** 部分：[publish-article.md](./publish-article.md)

---

## 可用工具

知乎专栏编辑器页面已注入以下 WebMCP 工具，直接调用即可完成操作，无需手动操作编辑器 DOM。

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `create_article` | 填写文章标题和 Markdown 正文（页面内自动转 HTML 粘贴） | `title`（标题字符串）、`content`（正文的 **Base64** 编码） |
| `get_article_info` | 在编辑器中获取当前草稿的标题和正文 | 无 |
| `publish_current_draft` | 在编辑器中自动添加话题并发布文章 | `topic`（主话题，必填）、`topics`（可选，额外话题数组，最多共 3 个） |

---

## 连续发布流程

新创建的文章在填写完毕后可直接通过工具进行智能分析并一键发布，无需经过人工审核或返回草稿箱。

### 第一步：打开编辑器

使用 `state` 检查当前标签。如果未打开知乎专栏编辑器，先导航过去：

```bash
webmcp-cli tabs open "https://zhuanlan.zhihu.com/write"
webmcp-cli state
```

> [!IMPORTANT]
> **标签页定位（必读）**
>
> 1. `tabs open` 会返回 `tabid`，后续 `run` 建议始终带上 `-t <tabid>`，避免命令打到错误的标签页。
> 2. 若页面跳转到登录页，请通知用户手动完成知乎登录后再继续。
> 3. 填写标题后 URL 可能变为 `https://zhuanlan.zhihu.com/p/{id}/edit`——这是正常现象，`create_article` 在新建页和编辑页均可工作。
> 4. 无参工具（如 `get_article_info`）可直接运行：`webmcp-cli run get_article_info` 或 `webmcp-cli run get_article_info '{}'`
> 5. 发布前务必 `tabs switch` 到含文章内容的编辑器标签页，再执行 `publish_current_draft`。

### 第二步：填写标题和正文

> [!NOTE]
> `create_article` 会在页面内将 Markdown 正文转换为 HTML，并粘贴到知乎 Draft.js 编辑器，正确渲染标题、加粗、列表、代码块、表格、引用等格式。正文首个 `# 标题` 会自动移除（标题请通过 `title` 参数传入）。

将文章内容写入 `.md` 文件后，通过 `@base64file:` 内联引用传入。**请使用上一步返回的 tabid**：

```bash
# TAB_ID 来自 tabs open 的返回值
webmcp-cli run create_article -t TAB_ID '{"title":"你的文章标题","content":"@base64file:./article.md"}'
```

> [!WARNING]
> - `title` 不能含有特殊引号等字符，否则 CLI 的 JSON 解析会失败
> - `@base64file:` 占位符会被 CLI 自动展开为 Base64 编码内容，无需手动处理
> - 知乎编辑器使用 Draft.js 富文本，页面内工具会将 Markdown 转为 HTML 后粘贴填入

如果需要传 JSON 文件（高级用法）：

```json
// article_args.json
{
  "title": "你的文章标题",
  "content": "@base64file:./article.md"
}
```

```bash
webmcp-cli run create_article -f ./article_args.json
```

### 第三步：使用内置工具一键发布

在编辑器页面内容填写完成后，直接使用注入该域名的 `publish_current_draft` 内置 MCP 工具一键完成话题选择并点击发布。

> [!IMPORTANT]
> - **切勿盲目使用默认值（"编程"）**！
> - 在运行发布工具前，AI 必须先调用 `get_article_info` 工具获取当前文章的标题和正文内容。
> - AI 需要基于获取的文章内容智能推断并选择最合适的 `topic`（主话题），可选传入 `topics` 数组添加 1~2 个相关话题。
> - 知乎发布前必须添加至少一个话题，话题名称需与知乎平台已有话题匹配。

```bash
# 1. 获取当前文章信息（无参数时可省略 '{}'）
webmcp-cli run get_article_info -t TAB_ID

# 2. 智能推断话题后，执行一键发布（必须在编辑器标签页上）
webmcp-cli run publish_current_draft -t TAB_ID '{"topic":"前端","topics":["Vue.js","Web开发"]}'
```

---

## 与掘金的差异说明

| 对比项 | 掘金 | 知乎 |
|--------|------|------|
| 编辑器 | CodeMirror (Markdown) | Draft.js (富文本) |
| 正文填入 | `setValue` / `dispatch` | 页面内 Markdown→HTML + ClipboardEvent / insertHTML 粘贴 |
| 发布元数据 | 分类 + 标签 + 摘要（50~100 字） | 话题（1~3 个） |
| 编辑器 URL | `juejin.cn/editor/drafts/new` | `zhuanlan.zhihu.com/write` |

---

## 常见问题

1. **未登录**：页面跳转到 `www.zhihu.com/signin`，需用户手动扫码或密码登录。
2. **话题未找到**：`topic` 名称需与知乎已有话题精确或近似匹配，可先用较短的核心词（如「人工智能」而非「人工智能应用实践」）。
3. **发布按钮无响应**：确认编辑器中标题和正文均已填写，且至少添加了一个话题。
