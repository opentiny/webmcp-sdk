# Design：快照为可滚动区域分配编号并标出剩余距离

## 方案概述

`buildVNode` 为每个元素计算 `scrollContainerToken`。元素可滚动时输出 token，并把它视为可交互元素分配 `#N`。`scroll` 带 `index` 时从元素自身开始查找可滚动元素，所以传面板自己的编号就会滚动面板，`handleScroll` 不需要改动。

## 涉及模块 / 文件

| 路径                                                | 职责                                               |
| --------------------------------------------------- | -------------------------------------------------- |
| `packages/next-sdk/page-tools/utils/scroll.ts`      | `scrollContainerToken`；`canScroll` 改为先比较尺寸 |
| `packages/next-sdk/page-tools/a11y/vnode.ts`        | 输出 token，可滚动元素分配编号                     |
| `packages/next-sdk/page-tools/page-agent-prompt.md` | token 说明                                         |
| `packages/next-sdk/page-tools/schema.ts`            | `scroll` 描述                                      |
| `docs/webmcp-sdk/page-agent-tool.md`                | 用户文档                                           |
| `packages/next-sdk/skills/page-agent/SKILL.md`      | 编码 Agent Skill                                   |

## 核心逻辑（简化）

```typescript
function scrollContainerToken(el: Element): string | undefined {
  if (el === body || el === html) return undefined
  const vertical = canScroll(el, true)
  if (!vertical && !canScroll(el, false)) return undefined
  // 纵向：上方 pagesAbove 屏，下方 pagesBelow 屏；只能水平滚动时：左侧 / 右侧
  return `scrollable="上方 x 屏，下方 y 屏"`
}
```

## 依赖变更

无。

## API / 行为变更

| 符号或行为          | 变更类型 | 说明                                  |
| ------------------- | -------- | ------------------------------------- |
| `browserState` 快照 | 修改     | 可滚动元素带 `#N` 与 `[scrollable=…]` |

## 风险与兼容

- 每次滚动后 token 中的屏数会变化，增量 Diff 会把该面板列为变更节点。
- 可滚动元素变成可交互元素，编号总数增加；后台页面通常只有几个可滚动区域。
- 嵌套的可滚动区域各自分配编号。
