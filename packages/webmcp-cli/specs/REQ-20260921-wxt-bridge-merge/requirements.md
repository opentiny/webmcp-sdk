# Spec：合并 WXT 扩展桥接模式与双向通信能力

## 元信息

- 状态：已交付
- 主责包：`packages/webmcp-cli`
- 关联需求：合并 `web-agent-enterprise/packages/robot-wxt-cli` 与 `next-sdk/packages/webmcp-cli`

## 背景

当前 `@opentiny/webmcp-cli` 仅支持基于 CDP（Chrome DevTools Protocol）的直连模式，自动拉起独立用户目录的 Chrome 沙箱进行页面交互，但无法复用用户真实浏览器的登录态、Cookie、企业内网 SSO 凭证。
`robot-wxt-cli` 支持通过 WebSocket 桥接与 Tiny Robot Chrome 扩展通信，复用用户日常登录环境，并支持浏览器扩展回调本地执行 Bash 命令和工作区选择的双向协同能力。
为了避免工具割裂，需将两者合并到 `@opentiny/webmcp-cli`，同时保留 CDP 和 WXT 两种模式，并统一页面操作工具名称与参数体验。

## 目标用户 / 场景

1. **开发者 / 测试工程师**：在 CI 或自动化测试场景下，继续使用无头或沙箱 CDP 模式进行无干扰批量自动化。
2. **业务运维 / 企业用户**：在内网 SSO、复杂验证码、需要真实登录态的业务系统场景下，通过 `--mode wxt` 经由扩展安全操控已有页面，并可把复杂任务整包委托给扩展内的 Tiny Robot 子代理。
3. **第三方 AI Agent**：通过独立配置加载 `webmcp-cli-cdp` 或 `webmcp-cli-wxt` 技能，准确调用 CLI 完成浏览器操控。

## 范围

### In Scope

- 支持 `--mode cdp`（默认）与 `--mode wxt` 模式切换，或通过 `WEBMCP_MODE=wxt` 环境变量配置。
- 引入 WebSocket 桥接架构：协议常量、消息派发、安全 Token 鉴权（`~/.robot-wxt/bridge-token`）、跨平台 Bash 命令执行器、工作空间安全路径管理、系统目录选择。
- 抽象统一的 `BrowserAdapter` 接口，分别实现 `CdpBrowserAdapter` 和 `WxtBrowserAdapter`。
- 保持页面工具协议统一：`page-agent-tool` 的 `browserState`、`click`、`fill`、`select`、`scroll` 等行为和 Schema 对齐。
- WXT 模式独有命令支持：`agent run`（委托子代理）、`skills list/get`、`token [get|set]`、`stop`（停止常驻服务）。
- 标准 MCP Server 支持两种底层模式（`webmcp-cli mcp` / `webmcp-cli --mode wxt mcp`）。
- 拆分两份独立面向 Agent 的 Skill 文档，并在 `skills.manifest.json` 中配置同步。

### Out of Scope

- 剪贴板操作（`clipboard`）仅在 CDP 模式保留，WXT 模式通过扩展原生能力实现，无需暴露 CLI 剪贴板指令。

## 用户故事与验收标准

1. 作为 Agent，我希望通过 `webmcp-cli --mode wxt state` 获取已连接 Chrome 扩展的当前标签页与注入工具。
   - 验收：自动拉起后台守护进程（18999 端口），扩展连接后返回包含数字 tabId 与 webmcpTools 的 JSON 结果。
2. 作为 Agent，我希望通过 `webmcp-cli --mode wxt run page-agent-tool '{"action":"click","index":12}'` 操作用户真实浏览器。
   - 验收：通过 WS 发送给扩展执行点击，并自动返回操作后的 diff 增量。
3. 作为 Agent，我希望在 CDP 模式下执行原有 `webmcp-cli state` 和 `run`，完全不受 WXT 合并影响。
   - 验收：CDP 原有全套功能与单测 100% 兼容通过。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] 两个独立的 Skill（`webmcp-cli-cdp` 与 `webmcp-cli-wxt`）编写完成并完成同步
