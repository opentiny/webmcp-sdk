# CSDN 文章发布指南

CSDN Markdown 编辑器网址：`https://editor.csdn.net/md/`

> [!IMPORTANT]
> 阅读本文档前，请先阅读通用指南中的 **"避坑准则"** 部分：[publish-article.md](./publish-article.md)

---

## 可用工具

CSDN 编辑器页面已注入以下 WebMCP 工具，直接调用即可完成操作，无需手动操作编辑器 DOM。

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `create_article` | 填写文章标题和正文 | `title`（标题字符串）、`content`（正文的 **Base64** 编码） |
| `get_article_info` | 在编辑器中获取当前草稿的标题和正文 | 无 |
| `publish_current_draft` | 自动填写标签、分类、摘要并发布文章 | `category`（分类）、`tags`（标签数组，1~3 个）、`summary`（必填，100 字以内的摘要） |

---

## 连续发布流程

新创建的文章在填写完毕后可直接通过工具进行智能分析并一键发布，无需经过人工审核或手动点击发布弹窗。

### 第一步：打开编辑器

使用 `state` 检查当前标签。如果未打开 CSDN 编辑器，先导航过去：

```bash
webmcp-cli tabs open "https://editor.csdn.net/md/"
webmcp-cli state
```

> [!IMPORTANT]
> **标签页定位（必读）**
>
> 1. `tabs open` 会返回 `tabid`，后续 `run` 建议始终带上 `-t <tabid>`，避免命令打到错误的标签页。
> 2. 若页面跳转到登录页，请通知用户手动完成 CSDN 登录后再继续。
> 3. 确认 `webmcpTools` 中包含 `create_article`、`get_article_info`、`publish_current_draft` 后再执行后续步骤。
> 4. 首次进入可能弹出 **「模版库」** 弹窗，`create_article` 会自动尝试关闭，但建议发布前再次 `state` 确认编辑器可操作。

### 第二步：填写标题和正文

将文章内容写入 `.md` 文件后，通过 `@base64file:` 内联引用传入。**请使用上一步返回的 tabid**：

```bash
# TAB_ID 来自 tabs open 的返回值
webmcp-cli run create_article -t TAB_ID '{"title":"你的文章标题","content":"@base64file:./article.md"}'
```

**推荐：PowerShell / cmd 使用 JSON 文件传参**

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
> - **PowerShell 终端**下直接内联 JSON 极易因转义失败，务必优先使用 `-f` 文件方式
> - `title` 不能含有特殊引号等字符，否则 CLI 的 JSON 解析会失败
> - `@base64file:` 占位符会被 CLI 自动展开为 Base64 编码内容，无需手动处理
> - CSDN 编辑器默认可能是「比对」模式，`create_article` 会自动切换到 Markdown 模式

### 第三步：使用内置工具一键发布

在编辑器页面内容填写完成后，直接使用 `publish_current_draft` 一键完成标签、分类选择和发布。

> [!IMPORTANT]
> - **切勿盲目使用默认值（"前端" 和 ["Vue.js"]）**！
> - 在运行发布工具前，AI 必须先调用 `get_article_info` 获取当前文章的标题和正文内容。
> - AI 需要基于获取的文章内容智能推断并选择最合适的 `category`（分类）与 `tags`（标签数组），并**自主总结出一段 100 字以内的文章摘要**，将该摘要传入 `summary` 字段。
> - **注意：传入的摘要字数必须严格在 100 字以内，否则发布工具将会报错并停止发布！**

```bash
# 1. 获取当前文章信息（无参数时可省略 '{}'）
webmcp-cli run get_article_info -t TAB_ID

# 2. 智能推断后，执行一键发布（必须在编辑器标签页上）
webmcp-cli run publish_current_draft -t TAB_ID '{"category":"前端","tags":["Vue.js","JavaScript","前端"],"summary":"本指南详细介绍了如何使用 WebMCP 让 AI 助手精准操控浏览器，涵盖安装配置、核心工具集使用方法及多种实战场景，是一篇极具实用价值的 AI Agent 教程。"}'
```

### 第四步：验证发布结果

```bash
webmcp-cli state -t TAB_ID
```

成功时页面跳转到 `mp.csdn.net/.../success/<articleId>`，标题为「发布成功」。

---

## CSDN 特有避坑

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 编辑器被遮挡 | 首次进入弹出「模版库」 | `create_article` 会自动关闭；若仍遮挡，用 `page-agent-tool` 手动关闭 |
| 标题填不进去 | Markdown 模式下 input 初始为 hidden | `create_article` 已自动点击 `.article-bar__title-display` 激活 |
| 正文格式丢失 | 直接设置 innerText 破坏 Markdown | `create_article` 优先 CodeMirror，否则用 ClipboardEvent 粘贴 |
| 点击发布无反应 | Vue 不响应原生 JS click / 遮罩拦截 | `publish_current_draft` 会自动移除 `.mark-mask-box-div` 遮罩 |
| 标签添加失败 | 右栏标签无独立 index | `publish_current_draft` 内置 JS 批量点选 `.el-tag` |
| PowerShell JSON 报错 | 内联 JSON 转义失败 | 改用 `create_article -f article_args.json` |
