# 开源中国文章发布指南

开源中国文章编辑器网址：`https://my.oschina.net/u/${uid}/blog/ai-write`

> [!IMPORTANT]
> 阅读本文档前，请先阅读通用指南中的 **"避坑准则"** 部分：[publish-article.md](./publish-article.md)

---

## 可用工具

开源中国页面已注入以下 WebMCP 工具，直接调用即可完成操作，无需手动操作编辑器 DOM。

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `create_article` | 填写文章标题和正文 | `title`（标题字符串）、`content`（正文的 **Base64** 编码） |
| `get_article_info` | 在编辑器中获取当前草稿的标题和正文 | 无 |
| `publish_current_draft` | 自动填写分类、标签、摘要并发布文章 | `category`（分类）、`tags`（标签数组）、`summary`（必填，建议 50~200 字摘要） |

---

## 连续发布流程

新创建的文章在填写完毕后可直接通过工具进行智能分析并一键发布。

### 第一步：打开编辑器

使用 `state` 检查当前标签。如果未打开开源中国编辑器，先导航过去：

```bash
webmcp-cli tabs open "https://my.oschina.net/u/${uid}/blog/ai-write"
webmcp-cli state
```

> [!IMPORTANT]
> **标签页定位（必读）**
>
> 1. `tabs open` 会返回 `tabid`，后续 `run` 建议始终带上 `-t <tabid>`，避免命令打到错误的标签页。
> 2. `${uid}` 是用户在开源中国的 uid 值（一串数字），**必须要求用户先提供**才能打开发布页。
> 3. 若页面跳转到登录页，请通知用户手动完成登录后再继续。
> 4. 确认 `webmcpTools` 中包含 `create_article`、`get_article_info`、`publish_current_draft` 后再执行后续步骤。

### 第二步：填写标题和正文

将文章内容写入 `.md` 文件后，通过 `@base64file:` 内联引用传入。**请使用上一步返回的 tabid**：

```bash
# TAB_ID 来自 tabs open 的返回值
webmcp-cli run create_article -t TAB_ID '{"title":"你的文章标题","content":"@base64file:./article.md"}'
```

如果需要传 JSON 文件（高级用法）：

```json
// article_args.json
{
  "title": "你的文章标题",
  "content": "@base64file:./article.md"
}
```

```bash
webmcp-cli run create_article -t TAB_ID -f ./article_args.json
```

> [!WARNING]
> - `title` 不能含有特殊引号等字符，否则 CLI 的 JSON 解析会失败
> - `@base64file:` 占位符会被 CLI 自动展开为 Base64 编码内容，无需手动处理
> - `create_article` 会自动切换到 Markdown 编辑器模式

### 第三步：使用内置工具一键发布

在编辑器页面内容填写完成后，直接使用 `publish_current_draft` 一键完成分类、标签选择并发布。

> [!IMPORTANT]
> - **切勿盲目使用默认值（"开源资讯" 和 ["开源"]）**！
> - 在运行发布工具前，AI 必须先调用 `get_article_info` 工具获取当前文章的标题和正文内容。
> - AI 需要基于获取的文章内容智能推断并选择最合适的 `category`（分类/专区）与 `tags`（标签数组），并**自主总结出一段 50~200 字的文章摘要**，将该摘要传入 `summary` 字段。
> - **注意：摘要过短（少于 20 字）将导致发布工具报错！**

```bash
# 1. 获取当前文章信息（无参数时可省略 '{}'）
webmcp-cli run get_article_info -t TAB_ID

# 2. 智能推断和总结摘要后，执行一键发布（必须在编辑器标签页上）
webmcp-cli run publish_current_draft -t TAB_ID '{"category":"开源资讯","tags":["Vue.js","前端","AI"],"summary":"本指南详细介绍了如何使用 WebMCP 让 AI 助手精准操控浏览器，涵盖安装配置、核心工具集的使用方法以及多种实际应用场景，是一篇极具实用价值的 AI Agent 实战教程，适合开发者快速上手。"}'
```

---

## 开源中国特有避坑

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 找不到编辑器 | 未提供 uid 或 URL 错误 | 向用户索取 uid，使用正确 URL |
| 正文未写入 | 未切换到 MD 模式 | `create_article` 会自动点击 `.editor-switch-btn` |
| 标签未添加 | 下拉建议未出现 | `publish_current_draft` 会等待建议或按 Enter 创建 |
| PowerShell JSON 报错 | 内联 JSON 转义失败 | 改用 `-f article_args.json` |
