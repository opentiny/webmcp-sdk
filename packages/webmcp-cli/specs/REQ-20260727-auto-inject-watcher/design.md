# Design：页面打开自动注入

## 方案概述

在 `connectBrowser` 成功后幂等拉起独立 Node 守护进程 `webmcp-cli watch`：

1. 常驻 CDP 连接
2. 现有 page + `targetcreated` → `evaluateOnNewDocument(inject-bundle)` + `injectIntoPage`
3. `framenavigated`（主框架）→ 再次 `injectIntoPage`（补 tabId / 域名工具）

PID 写在 workspace：`.inject-watcher.pid`。环境变量 `WEBMCP_NO_WATCHER=1` 跳过；watcher 自身设 `WEBMCP_WATCHER_CHILD=1` 防止递归拉起。

## 涉及文件

- `src/watcher-process.ts` — PID / spawn
- `src/commands/watch.ts` — 守护主循环
- `src/browser.ts` — `connectBrowser` 末尾 `ensureInjectWatcher`
- `src/bin.ts` — 注册 `watch`
- 测试 / docs

## 风险

- 多 CDP 客户端并存：可接受
- watcher 崩溃：下次 CLI 命令会再次 ensure
- about:blank / chrome://：跳过非 http(s)
