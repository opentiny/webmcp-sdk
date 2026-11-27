# Spec：快照为可滚动区域分配编号并标出剩余距离

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：无
- 依赖：[`REQ-20261126-scroll-inner-container`](../REQ-20261126-scroll-inner-container/)

## 背景

`scroll` 带 `index` 时滚动该元素或其最近的可滚动祖先，但快照只给可交互元素分配编号。后台页面的列表面板、侧栏通常是没有名称、没有交互角色的 `div`，快照里看不到它可以滚动，也没有它的编号。页面上有多个可滚动面板时，不带 `index` 的 `scroll` 只会滚动视口中央那一个；要滚动其他面板，Agent 只能找面板里某个可交互元素的编号来传，或者改用 `executeJavascript`。快照也不显示面板还能滚多远。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/a11y/vnode.ts`
- `packages/next-sdk/page-tools/utils/scroll.ts`
- browser-use：快照中为可滚动元素标出上方、下方剩余的页数
- page-agent：为可滚动元素输出 `data-scrollable`

## 范围

### In Scope

- `browserState` 快照中，能沿任一轴原生滚动的元素（不含 `body` / `html`）分配 `#N` 编号，并输出 `[scrollable="上方 x 屏，下方 y 屏"]`；只能水平滚动时输出「左侧 / 右侧」。「可滚动」的判定与 `scroll` 相同：该轴计算样式 `overflow` 为 `auto` / `scroll` / `overlay`，且内容超出可视区域。
- `page-agent-prompt.md` 的 token 说明与 `schema.ts` 的 `scroll` 描述说明可以传该编号滚动。

### Out of Scope

- 文档本身的滚动位置：由 `scroll` 结果报告。
- 只响应 `wheel` 事件的自绘滚动区（`overflow: hidden`）：没有原生滚动范围，不标出。

## 用户故事与验收标准

1. 作为 Agent，我在快照里看到没有名称的滚动面板，希望知道它可以滚动、还能滚多远。
   - 验收：面板带 `#N` 与 `[scrollable="上方 1.0 屏，下方 3.0 屏"]`（`scrollTop` 200、可视高度 200、内容高度 1000）。
2. 内容没有超出，或 `overflow` 为 `hidden` 的元素不标 `scrollable`。
3. 把快照里面板的编号传给 `scroll`，滚动的是这个面板。
   - 验收：`numPages: 1` 时面板 `scrollTop` 增加一个可视高度。

## 非功能要求

- 判定可滚动时先比较尺寸、再取计算样式，快照遍历时只对内容超出的元素取计算样式。
- 不新增公开 API 或配置项。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/page-agent-tool.md`、`skills/page-agent/SKILL.md`、`page-tools/schema.ts`、`page-tools/page-agent-prompt.md` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 通过
