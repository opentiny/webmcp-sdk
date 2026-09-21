---
name: webmcp-cli-cdp
description: 面向第三方 AI Agent 的 CDP 直连模式执行指南：通过 Chrome DevTools Protocol 独立沙箱操作浏览器，自动注入 page-agent-tool 及领域工具。
license: MIT
metadata:
  author: opentiny
  version: '2.0.0'
---

# WebMCP CLI (CDP 直连模式) Skill

本 Skill 指导 AI Agent 如何通过 `@opentiny/webmcp-cli` 的 **CDP 模式**（Chrome DevTools Protocol 直连）操控浏览器。

## 适用场景与特征

- **独立沙箱**：自动在后台启动独立的 Chrome 实例（默认配置位于 `~/.webmcp_chrome_profile`），无需预先开启用户浏览器。
- **自动化与 CI 优先**：适合可重复的回归测试、批量网页内容提取、自动化脚本任务。
- **环境自动注入**：自动向目标网页注入 `webmcp-polyfill` 与内置的 `page-agent-tool`。
- **标识特征**：
  - 命令直接调用 `webmcp-cli <command>`（默认即 CDP 模式，无需额外参数）；
  - Tab ID 格式为 **32 位 UUID 字符串**（Chrome Target ID）；
  - 支持 CDP 专属的系统剪贴板操作（`clipboard`）。
  - **不复用**用户真实浏览器的登录态与 Cookie。

## 安装

当 shell 终端提示找不到工具时执行：

```bash
npm install -g @opentiny/webmcp-cli
```

---

## 命令集与规范

### 1. 管理浏览器标签页 `webmcp-cli tabs`

```bash
webmcp-cli tabs open https://excalidraw.com    # 打开新网页，返回目标 tabid (UUID)
webmcp-cli tabs switch <tabid>                 # 切换到指定标签页
webmcp-cli tabs close <tabid>                  # 关闭指定标签页
webmcp-cli tabs back                           # 当前标签页后退
webmcp-cli tabs back <tabid>                   # 指定标签页后退
webmcp-cli tabs forward                        # 当前标签页前进
webmcp-cli tabs forward <tabid>                # 指定标签页前进
```

### 2. 查询浏览器当前状态 `webmcp-cli state`

返回当前活跃页签的**导航元数据**（URL、标题、所有打开页签、当前已注入的 `webmcpTools` 清单）。

```bash
webmcp-cli state
webmcp-cli state -t <tabid>   # 指定某个标签页（UUID 字符串）
```

**输出示例：**
```json
{
  "url": "https://www.baidu.com/",
  "title": "百度一下，你就知道",
  "webmcpTools": [{ "name": "page-agent-tool" }, { "name": "baidu_search" }],
  "tabs": [
    { "tabid": "2EA73ED323E46E5E108D4E46DA4E4AA7", "title": "百度一下，你就知道", "url": "https://www.baidu.com/" }
  ]
}
```

> **注意**：`state` 不返回页面的可交互元素（DOM 树）。获取元素必须使用 `page-agent-tool` 的 `browserState` 或 `searchTree`。

---

### 3. 系统剪贴板操作 `webmcp-cli clipboard`（CDP 专属）

```bash
webmcp-cli clipboard                      # 读取当前系统剪贴板文本
webmcp-cli clipboard "需要写入剪贴板的内容"   # 写入文本到系统剪贴板
```

---

### 4. 页面元素感知与操作 `webmcp-cli run`

#### 4.1 终端 JSON 参数转义规则

根据不同终端严格遵守引号规范，避免 `参数不是有效的 JSON` 错误：
- **bash / zsh 终端**：使用单引号包裹 JSON：`'{"action": "click", "index": 0}'`
- **cmd 终端**：双引号包裹，内部双引号转义：`"{\"action\": \"click\", \"index\": 0}"`
- **PowerShell 终端**：单引号包裹，内部双引号反斜杠转义：`'{\"action\": \"click\", \"index\": 0}'`

#### 4.2 内置核心工具 `page-agent-tool`

每个页面均会自动注入该工具。支持动作（`action`）：
`browserState`、`searchTree`、`click`、`fill`、`select`、`scroll`、`executeJavascript`、`hover`。

操作返回格式（`responseMode`）：
- **`diff`**（默认）：仅返回操作后页面的增量差异，极度节省 Token。
- **`full`**：返回当前视口完整的 ARIA YAML 无障碍树。
- **`both`**：同时返回全量树与增量差异。

执行 `click`、`fill`、`select`、`scroll` 等操作后，工具会**自动返回最新页面 diff**，通常无需再次手动调用 `browserState`。

---

## 页面状态获取与决策流（核心规范）

### 1. `searchTree` 优先原则（节省 80%+ Token）

**决策流程：**
```
已知要找的元素类型或文字（如“搜索”、“登录”、“button”）？
    ↓ 是
    → 先用 searchTree 搜索
        ↓ 找到了？
            是 → 直接使用命中的 #N 索引操作（click / fill 等）
            否 → 再用 browserState(full) 获取全量树兜底
    ↓ 否（初次进入未知页面或探索全局结构）
    → 用 browserState(full) 抓取完整树
```

**用法示例：**
```bash
# 按角色或文字精准搜索
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "登录"}'
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "button", "contextLines": 2}'
webmcp-cli run page-agent-tool '{"action": "searchTree", "query": "#42"}'
```

输出命中行会带 `>>>` 标记，并给出目标元素的 `#N` 索引编号。

### 2. 获取无障碍树 `browserState`

```bash
# 首次进入页面获取完整树
webmcp-cli run page-agent-tool '{"action": "browserState", "responseMode": "full"}'

# 对指定标签页获取
webmcp-cli run page-agent-tool '{"action": "browserState"}' -t 2EA73ED323E46E5E108D4E46DA4E4AA7
```

**无障碍树格式：**
`- role #N [token1] [token2] "accessible name"`
- `role`：ARIA 语义（button / link / textbox / radio 等）；
- `#N`：**唯一操作索引**，仅带 `#N` 的元素才能交互，将其数值传入 `index`；
- `[token]`：状态标记（`[checked]`、`[disabled]`、`[cursor=pointer]` 等）；
- `"accessible name"`：元素可访问名。

> ⚠️ **每次交互操作后，`#N` 会重新分配，严禁复用历史旧索引。**

### 3. 具体交互操作

```bash
# 点击
webmcp-cli run page-agent-tool '{"action": "click", "index": 16}'

# 填写输入框
webmcp-cli run page-agent-tool '{"action": "fill", "index": 15, "text": "OpenTiny"}'

# 下拉选择
webmcp-cli run page-agent-tool '{"action": "select", "index": 7, "value": "option_value"}'

# 页面滚动（0.5 = 半页，1.0 = 一页）
webmcp-cli run page-agent-tool '{"action": "scroll", "direction": "down", "amount": 500}'

# 执行 JavaScript
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "return document.title"}'
```

---

## 操作约束与安全边界

1. **仅与带 `#N` 的元素交互**，绝对不要臆测不存在或已过期的索引。
2. **优先分析 Diff**：点击或填写后，优先阅读自动返回的 Diff 增量确认操作成效。
3. **不要重复相同失败动作超过 3 次**。
4. **验证码阻塞**：若遇到验证码，应主动告知用户手动处理，切勿盲目循环尝试。
5. **不要在无凭据情况下尝试登录**；如需用户真实登录态，应提示用户切换为 **WXT 模式**。

---

## 领域专用工具（`domains/`）

当导航到特定站点时，页面会自动注册专用工具（可通过 `state` 确认），进入相关页面请查阅对应指引：

| 目标域名 | 注册工具 | 业务指引文档 |
|---|---|---|
| `excalidraw.com` | `excalidraw_execute_command` | [domains/excalidraw.md](domains/excalidraw.md) |
| `juejin.cn` | `create_article`, `publish_current_draft` | [domains/publish-article-in-juejin.md](domains/publish-article-in-juejin.md) |
| `editor.csdn.net` | `create_article`, `publish_current_draft` | [domains/publish-article-in-csdn.md](domains/publish-article-in-csdn.md) |
| `my.oschina.net` | `create_article`, `publish_current_draft` | [domains/publish-article-in-oschina.md](domains/publish-article-in-oschina.md) |
| `segmentfault.com` | `create_article`, `segmentfault_publish_article` | [domains/publish-article-in-segmentfault.md](domains/publish-article-in-segmentfault.md) |
| `xiaohongshu.com` | `xhs_search_notes`, `xhs_publish_note` | 查看工具 Schema 直接调用 |

**调用示例：**
```bash
# Excalidraw 画布操作
webmcp-cli run excalidraw_execute_command '{"eventName": "getSceneElements"}'

# 掘金发布文章（支持 @base64file 文件引用）
webmcp-cli run create_article '{"title": "技术文章", "content": "@base64file:./post.md"}'
```

---

## 启动为标准 MCP 服务

```bash
# 启动 MCP Server（stdio 传输，暴露原子工具）
webmcp-cli mcp
```
