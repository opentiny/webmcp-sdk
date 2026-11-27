# Spec：scroll 按百分比定位并报告当前位置

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：无
- 依赖：[`REQ-20261126-scroll-inner-container`](../REQ-20261126-scroll-inner-container/)

## 背景

虚拟列表只渲染可见的行，目标行在滚动到附近之前不在 DOM 里。几千行的列表中，`scroll` 每次只能按屏数或像素相对滚动，结果也只报告上方、下方还有几屏，Agent 要连续滚动很多次，或改用 `executeJavascript` 直接修改 `scrollTop`。当目标的大致位置可以从编号、日期或排序推算出来时（例如编号 T10001–T15000 的列表里找 T13702），按比例直接跳到附近更快。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/handlers/scroll.ts`
- Stagehand：`scrollTo` 接受百分比
- Nanobrowser：滚动到顶部、底部或指定位置

## 范围

### In Scope

- `scroll` 新增可选参数 `percent`（0–100）：把滚动目标的纵向位置直接设为可滚动范围的该比例处，不播放平滑动画；提供 `percent` 时不需要 `down`、`numPages`、`pixels`。滚动目标的选择规则与按方向滚动相同；不带 `index` 时，页面本身有纵向滚动范围就滚动页面。
- 纵向滚动的结果在位置信息末尾附「位置 x%」。
- 页面和容器都没有纵向滚动范围时，结果说明没有可按百分比定位的滚动区域，不报「已到达底部」。

### Out of Scope

- 水平方向的百分比定位。
- 自行处理滚轮、没有原生滚动范围的区域。

## 用户故事与验收标准

1. 作为 Agent，在 5000 行的虚拟列表里，我希望一次跳到 74% 处。
   - 验收：`scroll(index=行, percent=74)` 后，容器 `scrollTop` = (scrollHeight − clientHeight) × 74%；结果含「位置 74%」。
2. 普通滚动的结果也附带位置百分比。
   - 验收：可滚动范围 1800px，滚动 450px 后结果含「位置 25%」。
3. 没有可以原生滚动的页面或容器时，`percent` 的结果不含「已到达底部」，说明无法按百分比定位。

## 非功能要求

- 不传 `percent` 时，滚动行为与现状一致，只在纵向位置信息后追加百分比。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/page-agent-tool.md`、`skills/page-agent/SKILL.md`、`page-tools/schema.ts` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 通过
