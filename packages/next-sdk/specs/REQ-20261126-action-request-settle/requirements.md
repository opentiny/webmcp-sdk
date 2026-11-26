# Spec：动作后等待动作期间发起的请求

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：无

## 背景

`click`、`fill`、`select` 执行后调用 `waitForDomSettled()`：150ms 内没有 DOM 变化即视为稳定，最长等 600ms，然后采集页面状态。`scroll` 只等待滚动动画结束。

点击搜索、切换筛选、滚到底部加载更多时，页面先显示加载态，接口返回后才渲染结果。接口耗时超过上述时间时，动作返回的 Diff 只有「搜索中…」或旧数据，Agent 需要再调用一次 `browserState`，或改用 `executeJavascript` 查询结果。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/utils/dom.ts`：`waitForDomSettled`
- `packages/next-sdk/page-tools/handlers/{click,fill,select,scroll}.ts`
- Claude in Chrome 提供 `wait` 动作，由模型决定等待时长

## 范围

### In Scope

- `click`、`fill`、`select`、`scroll` 执行后，等待动作期间页面通过 `fetch` / `XMLHttpRequest` 发起的请求结束，再执行原有的 DOM 稳定等待。
- 动作开始前已在进行的请求不计入。
- 等待请求的上限 4 秒，超过后不再等待请求，继续执行 DOM 稳定等待。

### Out of Scope

- `hover`、`browserState`、`executeJavascript`。
- WebSocket、SSE、`navigator.sendBeacon`、图片等资源加载，以及由定时器延迟渲染的内容。
- 新增 `wait` 动作或可配置的等待上限。
- 同源 iframe 内页面发起的请求。

## 用户故事与验收标准

1. 作为 Agent，我点击「查询」后希望返回的状态里已有查询结果，而不是加载态。
   - 验收：点击处理函数发起 800ms 后返回的 `fetch`，`handleClick` 返回前 DOM 已渲染结果。
2. 作为 Agent，我希望页面上的轮询或长连接不让每次动作都等到上限。
   - 验收：动作开始前发起、10 秒后才返回的请求，不让 `handleClick` 的耗时超过 1.5 秒。

## 非功能要求

- 不新增公开 API 或配置项。
- 包装后的 `fetch` / `send` 原样转发参数与返回值，不改变请求行为。
- 页面上没有请求时，额外等待只有 30ms 的请求登记时间。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/page-agent-tool.md` 与 `skills/page-agent/SKILL.md` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 通过
