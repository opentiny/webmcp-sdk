# Spec：页面打开自动注入

## 元信息

- 状态：已交付
- 主责包：`packages/webmcp-cli`
- 关联：元素检视浮钮依赖注入后才会出现

## 背景

当前仅在执行 `tabs` / `state` / `run` 等命令时才会 `injectIntoPage`。用户在 Chrome 里手动开页或导航后，没有浮钮，必须再跑一次 CLI。需要常驻注入监听，在页签创建/导航时自动注入。

## 范围

### In Scope

- 连接/启动浏览器后自动拉起后台 inject watcher（幂等）
- 监听新 page target；对已有页签补注入
- `evaluateOnNewDocument` + 导航后补齐 tabId / 域名工具
- `webmcp-cli watch` 命令（供守护进程自身执行）
- `WEBMCP_NO_WATCHER=1` 可关闭

### Out of Scope

- 改成真正的 Chrome Extension
- 对 `chrome://` 等非 http(s) 页注入

## 用户故事

1. 作为开发者，我希望用 CLI 打开浏览器后，在地址栏进任意站点也能看到 WebMCP 浮钮，无需再执行 state/run。
   - 验收：启动浏览器并打开新 http(s) 页后数秒内出现 `#opentiny-dom-inspect-fab`（或迷你入口）。

## 完成定义

- [x] Spec / 实现 / 测试 / 文档
