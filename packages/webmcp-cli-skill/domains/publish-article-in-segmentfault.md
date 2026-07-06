# SegmentFault（思否）文章发布指南

思否写文章编辑器网址：`https://segmentfault.com/write`

> [!IMPORTANT]
> 阅读本文档前，请先阅读通用指南中的 **"避坑准则"** 部分：[publish-article.md](./publish-article.md)

---

## 可用工具

思否页面已注入以下 WebMCP 工具（与掘金对齐的三件套 + 高级流程工具）：

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `create_article` | 填写文章标题和正文 | `title`（标题）、`content`（正文 **Base64** 编码） |
| `get_article_info` | 在编辑器中获取当前草稿的标题和正文 | 无 |
| `publish_current_draft` | 自动设置分类、标签并发布文章 | `category`（分类）、`tags`（标签数组，1~5 个） |
| `segmentfault_publish_article` | 高级流程工具（导航、引导、定时发布等） | `action` 及对应参数，见下文 |

---

## 连续发布流程（推荐）

与掘金一致的三步流程：打开编辑器 → 填写内容 → 智能分析后一键发布。

### 第一步：打开编辑器

使用 `state` 检查当前标签。如果未在思否编辑器，先导航并过引导页：

```bash
webmcp-cli tabs open "https://segmentfault.com/howtowrite"
webmcp-cli state

# 若在引导页，点击继续进入编辑器
webmcp-cli run segmentfault_publish_article -t TAB_ID '{"action":"click_howtowrite_continue"}'
webmcp-cli state
```

> [!IMPORTANT]
> **标签页定位（必读）**
>
> 1. `tabs open` 会返回 `tabid`，后续 `run` 建议始终带上 `-t <tabid>`。
> 2. 如未登录会跳转到 `/user/login`，需用户手动登录后再继续。
> 3. 若已在 `/write` 编辑器页面，可跳过引导步骤。
> 4. 确认 `webmcpTools` 中包含 `create_article`、`get_article_info`、`publish_current_draft` 后再执行后续步骤。

### 第二步：填写标题和正文

将文章内容写入 `.md` 文件后，通过 `@base64file:` 内联引用传入：

```bash
# TAB_ID 来自 tabs open 的返回值
webmcp-cli run create_article -t TAB_ID '{"title":"你的文章标题","content":"@base64file:./article.md"}'
```

> [!WARNING]
> - `title` 须为 5~100 字符，不能含有特殊引号等字符
> - `@base64file:` 占位符会被 CLI 自动展开为 Base64 编码内容
> - 思否停止输入后约 4 秒自动保存草稿，`create_article` 内部会等待保存完成

### 第三步：使用内置工具一键发布

在编辑器页面内容填写完成后，使用 `publish_current_draft` 一键完成分类、标签设置并发布。

> [!IMPORTANT]
> - **切勿盲目使用默认值（"前端" 和 ["前端","AI"]）**！
> - 在运行发布工具前，AI 必须先调用 `get_article_info` 获取当前文章的标题和正文内容。
> - AI 需要基于文章内容智能推断 `category`（分类）与 `tags`（标签数组，最多 5 个）。
> - 发布前务必 `tabs switch` 到含文章内容的编辑器标签页。

```bash
# 1. 获取当前文章信息
webmcp-cli run get_article_info -t TAB_ID

# 2. 智能推断后，执行一键发布
webmcp-cli run publish_current_draft -t TAB_ID '{"category":"前端","tags":["Vue.js","AI Agent","WebMCP"]}'
```

---

## 高级流程（可选）

如需导航、定时发布、封面提示等完整能力，使用 `segmentfault_publish_article`：

```bash
# 单条命令走完：导航 → 过引导 → 填内容 → 设选项 → 保存草稿
webmcp-cli run segmentfault_publish_article -t TAB_ID '{
  "action": "publish_full_flow",
  "title": "文章标题",
  "content": "# 正文\n\n内容...",
  "category": "前端",
  "tags": ["前端", "AI"],
  "scheduled_time": "2026-07-01T10:00:00+08:00"
}'
```

### 高级 Action 速查

| Action | 说明 | 必填参数 |
|--------|------|----------|
| `publish_full_flow` | 完整写入流程（导航+填内容+保存草稿） | `title`, `content`, `category` |
| `navigate_to_write` | 导航到引导页 | - |
| `click_howtowrite_continue` | 过引导页 | - |
| `write_article` | 一键写入（不含导航） | `title`, `content`, `category` |
| `set_scheduled_publish` | 设置定时发布 | `scheduled_time` |
| `discard_draft` | 舍弃草稿 | - |
| `get_state` | 获取编辑器状态（不含完整正文） | - |
| `publish` | 旧版发布（需 `confirm: true`） | `confirm` |

---

## 思否特有避坑

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 未登录 | Cookie 失效 | 用户手动登录 SegmentFault |
| 引导页阻塞 | 首次写文章 | 执行 `click_howtowrite_continue` |
| 正文未保存 | 思否 4 秒自动保存机制 | 工具内部等待 4.5 秒 |
| 封面图 | 工具不处理文件上传 | 流程中提示用户手动上传 |
| 标签默认前端+AI | 未基于内容推断 | 必须先 `get_article_info` 再发布 |

## 错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| `NOT_LOGGED_IN` | 未登录 | 手动登录 SegmentFault |
| `NOT_EDITOR` | 不在编辑器 | 先导航到 `/write` |
| `EDITOR_NOT_READY` | 编辑器未加载 | 刷新页面重试 |
| `TOO_SHORT` / `TOO_LONG` | 标题长度不符 | 标题 5~100 字符 |
| `TOO_MANY` | 标签过多 | 最多 5 个 |
| `CANNOT_PUBLISH` | 不满足发布条件 | 查看 `get_state` 的 errors |
