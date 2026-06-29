# CSDN 文章发布指南

CSDN Markdown 编辑器网址：`https://editor.csdn.net/md/`

> [!IMPORTANT]
> 阅读本文档前，请先阅读通用指南中的 **"避坑准则"** 部分：[publish-article.md](./publish-article.md)

---

## 可用工具

CSDN 编辑器页面已注入 `create_article` WebMCP 工具，直接调用即可完成标题和正文填写，无需手动操作编辑器 DOM。

| 工具名 | 描述 | 参数 |
|--------|------|------|
| `create_article` | 填写文章标题和正文 | `title`（标题字符串）、`content`（正文的 **Base64** 编码） |

---

## 阶段一：创建草稿（人工审核前）

> [!IMPORTANT]
> 新文章**不要直接发布**，完成第三步后停止，等待人工审核。审核通过后再执行「阶段二」。

### 第一步：打开编辑器

使用 `state` 检查当前标签。如果未打开 CSDN 编辑器，先导航过去：

```bash
webmcp-cli tabs open "https://editor.csdn.net/md/"
webmcp-cli state
```

> 若页面跳转到登录页，请通知用户手动完成 CSDN 登录后再继续。

确认 `webmcpTools` 中包含 `create_article` 工具后再执行后续步骤。

### 第二步：关闭「模版库」弹窗（必须先做）

首次进入 CSDN 发布页时，页面会自动弹出 **「模版库」** 弹窗，遮挡标题和正文编辑器。**必须先关闭该弹窗，再填写文档。**

```bash
webmcp-cli state  # 确认弹窗已出现，定位关闭按钮索引
```

**方式 A：点击关闭按钮（推荐）**

从 `state` 输出的 `content` 中找到「模版库」弹窗内的关闭按钮（通常为 `×` 或「取消」），执行 click：

```bash
webmcp-cli run page-agent-tool '{"action": "click", "index": <关闭按钮索引>}'
webmcp-cli state  # 确认弹窗已消失，编辑器可操作
```

**方式 B：用 JS 关闭（click 无效时）**

```bash
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "const modal=Array.from(document.querySelectorAll(\".modal\")).find(el=>el.textContent?.includes(\"模版库\")||el.textContent?.includes(\"模板库\"));if(!modal)return\"no modal\";const btn=modal.querySelector(\"button.modal__close-button,[aria-label=\\\"关闭\\\"],[title=\\\"关闭\\\"]\")||Array.from(modal.querySelectorAll(\"button,div\")).find(el=>el.textContent?.trim()===\"取消\");if(btn){btn.click();return\"closed\"}return\"no close btn\""}'
webmcp-cli state
```

> [!NOTE]
> `create_article` 工具内部也会尝试关闭模版库弹窗，但弹窗可能异步出现。因此**仍建议在本步骤显式关闭并 `state` 确认**，避免填写时编辑器被遮挡。

### 第三步：填写标题和正文（完成后停止）

将文章内容写入 `.md` 文件后，通过 `@base64file:` 内联引用传入。

**推荐：使用 JSON 文件传参（PowerShell / cmd 均适用）**

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

> [!WARNING]
> - **PowerShell 终端**下直接内联 JSON 极易因转义失败，务必优先使用 `-f` 文件方式
> - `title` 不能含有特殊引号等字符，否则 CLI 的 JSON 解析会失败
> - `@base64file:` 占位符会被 CLI 自动展开为 Base64 编码内容，无需手动处理
> - CSDN 编辑器默认可能是「比对」模式，`create_article` 会自动切换到 Markdown 模式

**bash 终端也可内联传参：**

```bash
webmcp-cli run create_article '{"title":"你的文章标题","content":"@base64file:./article.md"}'
```

> [!NOTE]
> 执行完第三步后，内容已填入 CSDN 编辑器。**此时停止，通知用户进行人工审核。**
> 审核通过后，再执行下方「阶段二」流程完成发布。

---

## 阶段二：审核通过后发布

> [!IMPORTANT]
> 仅在用户确认人工审核通过后，才执行本阶段。

### 第一步：确认编辑器页面

```bash
webmcp-cli state  # 确认当前在 editor.csdn.net 且内容无误
```

若模版库弹窗再次出现，重复阶段一的第二步关闭后再继续。

### 第二步：点击「发布文章」按钮

> [!NOTE]
> 页面上会出现**两个**「发布文章」按钮：编辑器工具栏上的一个（打开弹窗），发布设置弹窗底部的一个（确认发布）。本步点击**编辑器工具栏**上的按钮。

```bash
webmcp-cli state
# 找到编辑器底部工具栏文本为「发布文章」的按钮并点击（非弹窗内的）
webmcp-cli run page-agent-tool '{"action": "click", "index": <编辑器发布文章按钮索引>}'
webmcp-cli state  # 等待发布设置弹窗出现
```

### 第三步：处理发布设置弹窗

CSDN 发布弹窗包含 **文章标签、分类、摘要** 等设置项。

#### 3.1 添加标签（必填，最多 7 个）

先点击「添加文章标签」打开标签弹窗，再操作：

```bash
webmcp-cli state
webmcp-cli run page-agent-tool '{"action": "click", "index": <添加文章标签按钮索引>}'
webmcp-cli state
```

CSDN 标签选择为**左右两栏**结构：左栏为分类（Python、Java、前端 等），右栏为该分类下的具体标签。

**方式 A：左栏分类 + 右栏标签 click（右栏有索引时）**

```bash
# 点击左栏分类（如「前端」对应的 li）
webmcp-cli run page-agent-tool '{"action": "click", "index": <左栏分类索引>}'

webmcp-cli state  # 刷新右栏标签列表

# 点击右栏具体标签（若有独立 index）
webmcp-cli run page-agent-tool '{"action": "click", "index": <右栏标签索引>}'
```

**方式 B：JS 批量点选标签（推荐，右栏标签常无独立 index）**

右栏 `.el-tag` 等元素往往不会出现在 `state` 的可交互索引中，用 JS 更可靠：

```bash
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "const tags=[\"vue.js\",\"javascript\",\"前端\"];const clicked=[];document.querySelectorAll(\".el-tag,span.tag,button.tag,[class*=tag]\").forEach(el=>{const t=el.textContent?.trim();if(tags.includes(t)){el.click();clicked.push(t)}});return JSON.stringify({clicked})"}'
```

选完标签后关闭标签子弹窗（点击弹窗内「关闭」按钮），再 `state` 确认主发布弹窗中已显示所选标签。

可根据文章主题选择 1～3 个相关标签。

#### 3.2 选择分类（必填）

```bash
webmcp-cli state
webmcp-cli run page-agent-tool '{"action": "click", "index": <分类选项索引>}'
```

#### 3.3 填写摘要

生成 100 字以内的文章概述，填入摘要 textarea：

```bash
webmcp-cli run page-agent-tool '{"action": "fill", "index": <摘要textarea索引>, "text": "这是一篇关于..."}'
```

#### 3.4 确定并发布

> [!WARNING]
> CSDN 弹窗可能存在 `mark-mask-box-div` 遮罩层拦截点击。若 `click` 无效，先用 JS 移除遮罩：

```bash
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "document.querySelectorAll(\".mark-mask-box-div\").forEach(m=>m.remove());return \"mask removed\""}'
```

```bash
webmcp-cli state
# 点击发布设置弹窗底部的「发布文章」按钮（与第二步不是同一个 index）
webmcp-cli run page-agent-tool '{"action": "click", "index": <弹窗内发布文章按钮索引>}'
```

### 第四步：验证发布结果

```bash
webmcp-cli state  # 确认页面跳转到 mp.csdn.net/.../success/<articleId>
```

成功时页面标题为「发布成功」，内容含「发布成功！正在审核中」，可点击「查看文章」获取链接。

通知用户发布完成，并提供文章链接（articleId 可从 URL 如 `.../success/161862322` 中获取）。

---

## CSDN 特有避坑

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 编辑器被遮挡 | 首次进入弹出「模版库」 | 填写前必须先关闭弹窗（阶段一步骤二） |
| 标题填不进去 | Markdown 模式下 input 初始为 hidden | `create_article` 已自动点击 `.article-bar__title-display` 激活 |
| 正文格式丢失 | 直接设置 innerText 破坏 Markdown | `create_article` 优先 CodeMirror，否则用 ClipboardEvent 粘贴 |
| 点击发布无反应 | Vue 不响应原生 JS click / 遮罩拦截 | 移除 `.mark-mask-box-div` 遮罩后再 click |
| 标签添加失败 | 右栏标签无独立 index | 用 3.1 方式 B 的 JS 点选 `.el-tag` |
| PowerShell JSON 报错 | 内联 JSON 转义失败 | 改用 `create_article -f article_args.json` |
| 两个「发布文章」按钮 | 工具栏按钮打开弹窗，弹窗按钮确认发布 | 第二步点工具栏，3.4 点弹窗底部 |
