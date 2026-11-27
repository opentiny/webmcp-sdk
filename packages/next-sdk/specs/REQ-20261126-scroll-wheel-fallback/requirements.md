# Spec：scroll 在自行处理滚轮的区域派发滚轮事件

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：无
- 依赖：[`REQ-20261126-scroll-inner-container`](../REQ-20261126-scroll-inner-container/)

## 背景

有些滚动区域不使用原生滚动：容器设为 `overflow: hidden`，页面脚本监听 `wheel` 事件，自己平移内容或只渲染可见的行（自绘列表、日志时间线、地图、画布）。这类区域没有可修改的 `scrollTop`，`scroll` 找不到可滚动的文档或容器，只能滚动 `window`。位移为 0，结果返回「已到达底部」，而区域里还有内容。

Agent 收到「已到达底部」后会停止滚动，或改用 `executeJavascript` 自己构造 `WheelEvent` 派发。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/handlers/scroll.ts`
- `packages/next-sdk/page-tools/utils/scroll.ts`
- browser-use：JS 滚动没有位移时，通过调试协议在容器中心发送真实滚轮事件

## 范围

### In Scope

- 文档和容器都不能沿该方向原生滚动、位移为 0 时，在目标元素上派发一次合成 `WheelEvent`。目标元素：带 `index` 时为该元素；不带 `index` 时为视口中央最上层的页面元素（跳过 SDK 操作遮罩与高亮层）。
- 滚动距离：`pixels`；没有 `pixels` 时为 `numPages` × 最近的 `overflow: hidden` / `clip` 祖先的可视高度（没有这样的祖先时用视口高度）；水平方向默认 300px。
- 事件被 `preventDefault`，或派发后页面 DOM 有变化（不含 SDK 遮罩与高亮层内的变化），视为页面响应：结果说明在哪个元素上派发了滚轮事件、距离多少。
- 页面没有响应时，保留原有的边界提示，并追加「派发滚轮事件后页面也没有变化」。

### Out of Scope

- 检查 `isTrusted` 的页面：合成事件 `isTrusted` 为 `false`，这类页面不会响应，需要调试协议发送真实滚轮，`page-tools` 运行在页面内不具备该能力。
- 自绘区域内的位置信息（已滚过多少、还剩多少）：页面没有暴露。

## 用户故事与验收标准

1. 作为 Agent，在只响应滚轮的区域上不带编号调用 `scroll`，希望区域内容向下平移。
   - 验收：视口中央元素收到 `deltaY` = 裁剪祖先可视高度的滚轮事件；结果含「已在 <div#…> 上派发滚轮事件」与「页面内容有变化」。
2. 带编号时在该元素上派发，距离按它最近的裁剪祖先换算。
   - 验收：`numPages: 2`、向上，裁剪祖先高 300px 时 `deltaY` 为 -600。
3. 视口中央最上层是 SDK 操作遮罩时，事件派发给遮罩下面的页面元素。
4. 派发期间只有 SDK 遮罩自己的 DOM 有变化时，不算页面响应。
5. 页面没有响应时，结果仍含「已到达底部」，并追加「派发滚轮事件后页面也没有变化」。

## 非功能要求

- 不新增公开 API 或配置项。
- 文档或容器能原生滚动时，行为与现状一致，不派发滚轮事件。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/page-agent-tool.md`、`skills/page-agent/SKILL.md`、`page-tools/schema.ts` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 通过
