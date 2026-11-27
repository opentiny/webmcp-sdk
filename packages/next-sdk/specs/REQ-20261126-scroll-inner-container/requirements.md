# Spec：scroll 滚动内部容器

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：无

## 背景

后台管理页、聊天窗口常把 `body` 设为 `overflow: hidden`，内容在内部面板里滚动。`scroll` 现状：

1. 不带 `index` 时只滚 `window`。文档不能滚动，位移为 0，返回「已到达底部」，面板实际还能滚。
2. 带 `index` 且编号指向面板里的一行时，对这一行自身调用 `scrollBy`。行元素不能滚动，同样返回「已到达底部」。`schema.ts` 对带 `index` 的描述是「滚动该索引处的容器（或其最近的可滚动祖先元素）」，实现没有查找祖先。

Agent 收到「已到达底部」后会停止滚动，或改用 `executeJavascript` 查找并修改 `scrollTop`。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/handlers/scroll.ts`
- `packages/next-sdk/page-tools/utils/scroll.ts`
- Claude in Chrome 的 `scroll`：位移不足时改滚 `elementFromPoint` 处的可滚动祖先

## 范围

### In Scope

- 带 `index`：滚动该元素；元素在该轴上不可滚动时，滚动最近的可滚动祖先（穿过 shadow root）。
- 不带 `index` 且文档不能沿该方向继续滚动：滚动视口中央所在的可滚动容器；找不到时滚动视口内可见面积最大的可滚动容器；仍找不到时保持现状（滚 `window` 并如实返回边界）。
- 实际滚动的不是文档或 `index` 元素本身时，结果文案注明容器（标签名、`id`、`aria-label`）。
- `numPages` 按实际滚动目标的可视高度换算。
- `schema.ts` 描述、用户文档、Skill 同步。

### Out of Scope

- 滚动后等待「加载更多」请求返回。
- 虚拟列表中定位目标行（滚动结果不附带容器内已渲染行的范围）。
- 跨 iframe 查找滚动容器。

## 用户故事与验收标准

1. 作为 Agent，我把面板里一行的编号传给 `scroll`，希望面板滚动。
   - 验收：最近的可滚动祖先 `scrollTop` 增加；结果含「滚动的是所在容器」与容器描述。
2. 作为 Agent，在 `body` 不能滚动的后台布局上不带编号调用 `scroll`，希望内容面板滚动。
   - 验收：视口中央所在的可滚动容器 `scrollTop` 增加；结果含「页面本身不能滚动」与容器描述。
3. 视口中央不在任何可滚动容器内时，滚动可见面积最大的可滚动容器。
   - 验收：面积较大的容器滚动，较小的不动。
4. 视口中央最上层是 SDK 的操作遮罩或高亮层时，按遮罩下面的页面元素选择容器。
   - 验收：遮罩下面那一行所在的容器滚动，面积更大的另一个容器不动。
5. 页面上没有可滚动区域时，如实返回边界。
   - 验收：结果含「已到达底部」。
6. `numPages: 1` 滚动容器时，位移等于容器的 `clientHeight`。

## 非功能要求

- 不新增公开 API 或配置项。
- 文档可以滚动时，不带 `index` 的行为与现状一致。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/page-agent-tool.md`、`skills/page-agent/SKILL.md`、`page-tools/schema.ts` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 通过
