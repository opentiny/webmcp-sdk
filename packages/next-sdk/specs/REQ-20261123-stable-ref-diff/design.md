# Design：page-agent-tool 稳定元素编号与结构化增量 Diff 重构

## 方案概述

围绕「DOM 元素身份锚定」与「生成端保护性结构化 Diff」重构 `page-agent-tool` 的状态感知链路：

1. **元素身份层（`a11y/`）**：引入基于 `WeakMap<Element, number>` + 单调自增计数器的 `ElementRefAllocator`，替代每次重建归零的局部计数器；并在序列化后过滤 `refMap` 使其与 YAML 实际输出的 `#N` 集合严格一致。
2. **增量对比与版本层（`page-state-cache.ts`）**：维护会话级 `rev` 版本号；利用稳定 `#ref` 对 Myers 行级差异块执行同 `#ref` 就近配对，补充最小父级缩进锚点；当变更行数占比 `> 50%` 或 Diff 文本长度 `>= 整页 YAML 长度` 时自动熔断回退整页树（`kind: 'full'`）。
3. **协议与生命周期层（`page-agent-tool.ts` / `context.ts` / `handlers/`）**：在状态 JSON 中输出 `kind`、`url`、`rev`、`baseRev`（公开类型 `BrowserStateSnapshot`）；统一各交互 handler 的失效引用错误为 `isError: true` + `errorCode: 'REF_NOT_PRESENTED'`；引入 `sessionGeneration` 守卫（`endTurn()` 与 `resetSession()` 均递增代次，令进行中的异步操作过期续体返回 `SESSION_RESET_ERROR_CODE`）；`PAGE_AGENT_CHAT_END_EVENT` 调用 `endTurn()` 清空 Diff 基线并拦截旧续体，`RegisteredPageAgentToolHandle.resetSession()` 用于新建/清空会话时完整归零。

## 涉及模块 / 文件

| 路径 | 职责 |
| --- | --- |
| `packages/next-sdk/page-tools/a11y/ref-allocator.ts` | 新增 `ElementRefAllocator` 与 `RefAllocator` 接口 |
| `packages/next-sdk/page-tools/a11y/types.ts` | `A11yTreeOptions` 增加可选 `refAllocator?: RefAllocator` |
| `packages/next-sdk/page-tools/a11y/vnode.ts` | `buildVNode` 通过 `RefAllocator` 分配稳定 `#ref`；编辑宿主（`contenteditable`）跳过单子合并保留自身 `textbox` ref；收集实际输出的 `#ref` |
| `packages/next-sdk/page-tools/a11y/build.ts` | 支持外部传入 `refAllocator`（默认新建临时实例保持纯函数兼容）；对齐 `refMap` 与输出 `lines` |
| `packages/next-sdk/page-tools/page-state-cache.ts` | 重构结构化 Diff（首尾剥离与快速熔断 + 全局 Wrapper/改名父节点配对抵消 + 文档序逐行锚点 + `rev`/`baseRev`） |
| `packages/next-sdk/page-tools/context.ts` | 定义 `REF_NOT_PRESENTED_ERROR_CODE`、`SESSION_RESET_ERROR_CODE`、`PageAgentToolErrorCode`、统一错误构造与结构化状态类型 |
| `packages/next-sdk/page-tools/page-agent-tool.ts` | 串联会话级 `ElementRefAllocator`、`PageStateCache`、`kind/rev/baseRev` 组装与 `resetSession` 句柄（重置时同步 `unhighlight()`） |
| `packages/next-sdk/page-tools/page-agent-tool-event.ts` | 接收 `{ getRefMap, endTurn }`；`PAGE_AGENT_CHAT_END_EVENT` 触发 `endTurn()`；透传 `errorCode` |
| `packages/next-sdk/page-tools/handlers/{click,fill,select,hover,scroll,searchTree}.ts` | 统一校验 `el && el.isConnected` 并走 `staleRefError`；`searchTree` 共用 `refAllocator` 且不污染 Diff 基线 |
| `packages/next-sdk/page-tools/page-agent-prompt.md` | 更新 `#N` 稳定绑定、过期不复用、`kind/rev/baseRev` 与 Diff 格式说明 |
| `packages/next-sdk/index.ts` | 导出 `ElementRefAllocator`、`REF_NOT_PRESENTED_ERROR_CODE` 及相关类型 |
| `docs/webmcp-sdk/page-agent-tool.md` / `packages/next-sdk/skills/page-agent/SKILL.md` | 同步用户文档与编码 Skill |

## 核心数据结构 / 类型定义

```typescript
/** DOM 元素稳定编号分配器接口 */
export interface RefAllocator {
  /** 为元素返回稳定编号：已分配则复用，未分配则单调递增分配新编号 */
  allocate(el: Element): number
  /** 重置映射表与计数器（新建或清空会话、宿主调用 resetSession() 时调用） */
  reset(): void
}

export type SnapshotKind = 'full' | 'diff'

export interface PageSnapshot {
  url: string
  lines: string[]
  rev: number
}

export interface StateCacheUpdateOptions {
  /** 强制返回全量快照（如显式传入 responseMode: 'full'） */
  forceFull?: boolean
}

interface DiffResultBase {
  /** 当前快照版本号（从 1 单调递增，reset 后归 0） */
  rev: number
  /** 上一次快照的 URL */
  prevUrl: string
  /** 新增行数 */
  addedLines: number
  /** 删除行数 */
  removedLines: number
  /** 结构化 +/- 差异文本（无变化时为 '# (no changes)'） */
  diffText: string
}

export interface FullDiffResult extends DiffResultBase {
  kind: 'full'
  /** 触发全量输出的原因（调试与测试断言用） */
  fullReason: 'initial' | 'url_changed' | 'forced' | 'diff_too_large'
}

export interface IncrementalDiffResult extends DiffResultBase {
  kind: 'diff'
  /** 本 diff 所基于的基准快照版本号 */
  baseRev: number
}

export type DiffResult = FullDiffResult | IncrementalDiffResult

export const REF_NOT_PRESENTED_ERROR_CODE = 'REF_NOT_PRESENTED' as const
export const SESSION_RESET_ERROR_CODE = 'SESSION_RESET' as const

export type PageAgentToolErrorCode =
  | typeof REF_NOT_PRESENTED_ERROR_CODE
  | typeof SESSION_RESET_ERROR_CODE

export type PageAgentToolErrorResult = PageAgentToolContentResult & {
  isError: true
  error: string
  errorCode?: PageAgentToolErrorCode
}

export type PageAgentToolHandle = {
  showMask: (options?: ShowMaskOptions) => Promise<void>
  hideMask: () => Promise<void>
  resetSession?: () => void
}

export type RegisteredPageAgentToolHandle = PageAgentToolHandle & {
  resetSession: () => void
}
```

## Diff 算法细节

1. **提取内容行与预计算父链**：剥离 `buildA11yTree` 外层 ```` ```yaml ```` 与 ```` ``` ```` 围栏，得到 `prevLines` 与 `currLines`；单次 O(N) 预计算每行的 `trimmed`、`indent`、`parentIndex`、`ref`、`identityKey`（带 `#ref` 用 `#N`，否则用 `trimmed`）与直接父节点 `directParent`。
2. **首尾公共行剥离与 O(N) 快速熔断**：先剥离首尾 `line` 与 `directParent` 完全相同的公共区间；当两侧中间区间行数之和 `>= 200` 时，先用 O(N) `trimmed` 多重集交集计算变更下界，若下界已超过 50% 直接跳过 Myers 返回 `diff_too_large`，避免整页重绘阻塞主线程。
3. **Myers 语义行对比 + 全局变更全集聚合**：在中间区间执行 `diffArrays(prevComparable, currComparable, { comparator: (a, b) => a.trimmed === b.trimmed && a.directParent === b.directParent, maxEditLength })`（`maxEditLength = Math.max(250, Math.min(totalLines, 1200))`，超限时直接返回 `undefined` 触发 `diff_too_large` 回退整页树），聚合成变更 Hunk、未变更行精确索引映射与全局 `allRemoved` / `allAdded`。
4. **全局包装层识别与父节点改名配对 LCS 抵消**：
   - 仅构建一次全局父子索引与带 `#ref` 节点集合；
   - **包装层抵消**：识别无 `#ref` 或对侧不存在的包装行 `W`，校验 `W` 的外层父节点精确映射到对侧同一父节点下标，并利用同父级左右最近未变更兄弟的映射区间 `(otherLowerBound, otherUpperBound)` 过滤对侧候选子节点（既支持同父级原本已有同级同名节点时仍准确抵消新包装层，又防止同名卡片跨父或跨位置移入新分组被误抵消），随后在过滤后的候选集上对其直接子节点求 `trimmed` LCS 并抵消；
   - **父节点改名配对**：按缩进由浅入深逐层贪心一对一配对，借助直接子节点整行倒排索引避免 $O(P^2)$ 扫描。带 `#ref` 父节点与无 `#ref` 父节点均要求外层父级兼容且存在共享直接子节点；带 `#ref` 仅允许同 `#ref` 配对，无 `#ref` 要求同 role 并支持词干/首词匹配（含行内拼装名称与无名称改 token 容器），候选按共享直接子节点数、名称相似度分、行号距离降序优选，在配对父节点下仅对整行完全相同的子节点序列求 LCS 并抵消，避免按序号错配且完整保留同父重排与跨父移动。
5. **文档序同步配对与逐行最小父级锚点（O(1)）**：
   - 复用预计算的 `ComparableLine.ref`（兼容多词 ARIA role：`/^\s*-\s+[^["]+?\s+#(\d+)(?:\s|$)/`）。
   - Hunk 内以同 `#ref` 唯一配对与已配对改名父节点作为同步锚点，按文档顺序输出且保证同区间及无配对点 hunk 中未配对删除行（`-`）排在新增行（`+`）之前；每行输出前沿预计算的 `parentIndex` 向上跳转最多 2 层补齐去重后的 `'  '` 上下文锚点（跨父移动的配对行分别补齐旧父级与新父级锚点）。
6. **三项熔断保护回退整页树**：
   - 若抵消后无任何实质变更，返回 `NO_CHANGES_DIFF_TEXT`（`# (no changes)`）。
   - 结合前述三项熔断条件：① 前置大窗口 O(N) 低重合预判或 Myers `maxEditLength` 超限；② `changedRatio = Math.max(addedLines, removedLines) / Math.max(prevLines.length, currLines.length) > 0.5`；③ `diffText.length >= yaml.length`（防体积倒挂）——命中任一项即判定 `fullReason = 'diff_too_large'`，回退为 `kind: 'full'`（不返回 `baseRev`，外层直接使用完整 `yaml`）。

## 依赖变更

无新增第三方依赖（复用已有 `diff` 包中的 `diffArrays`）。

## API / 行为变更

| 符号或行为 | 变更类型 | 说明 |
| --- | --- | --- |
| `ElementRefAllocator` / `RefAllocator` | 新增 | 稳定 DOM 元素 `#ref` 分配器，支持 `allocate(el)` 与 `reset()` |
| `A11yTreeOptions.refAllocator` | 新增（可选） | 允许外部传入持久化分配器；省略时单次调用仍从 `#0` 开始 |
| `PageAgentToolHandle.resetSession` / `RegisteredPageAgentToolHandle` | 新增 | `PageAgentToolHandle.resetSession` 保持可选兼容外部 mock；`registerPageAgentTool` 返回 `RegisteredPageAgentToolHandle` 必含 `resetSession()` |
| `PAGE_AGENT_CHAT_END_EVENT` 监听行为 | 修改 | 除 `hideMask()` 外调用 `endTurn()` 递增 `sessionGeneration`（令进行中的异步续体返回 `SESSION_RESET`）并清空 Diff 基线（`rev` 持续递增、`#ref` 不跨轮复用） |
| `BrowserStateSnapshot` / `SnapshotKind` | 新增 | 导出与 `browserState` 返回 JSON 一致的公开类型（含 `kind`、`url`、`title`、`rev`、`baseRev?`、`content` 等） |
| 失效 `#ref` 与过期续体错误码 | 新增 | 导出 `REF_NOT_PRESENTED_ERROR_CODE`、`SESSION_RESET_ERROR_CODE` 及联合类型 `PageAgentToolErrorCode` |

## 数据流 / 时序

```mermaid
flowchart TD
  A["工具调用 (browserState / click / fill / ...)"] --> B{"带 index 的交互动作?"}
  B -->|是| C{"currentRefMap 含 index 且 el.isConnected?"}
  C -->|否| D["返回 isError: true + errorCode: REF_NOT_PRESENTED"]
  C -->|是| E["执行 DOM 动作并等待稳定"]
  B -->|否| F["直接采集状态"]
  E --> F
  F --> G["buildA11yTree(body, { refAllocator })"]
  G --> H["WeakMap 复用已有 #ref，新元素分配新 #ref"]
  H --> I["PageStateCache.update(url, yaml, { forceFull })"]
  I --> J{"首次 / URL 变 / forceFull / 变更>50% / diff>=full?"}
  J -->|是| K["kind: 'full', rev: N, content: yaml"]
  J -->|否| L["同 #ref 配对 + 父级锚点 → kind: 'diff', rev: N, baseRev: N-1, content: diffText"]
```

## 风险与兼容

- **`buildA11yTree` 向后兼容**：未传 `refAllocator` 时每次调用内部新建分配器，保证现有纯函数调用与全部历史单测零破坏。
- **`searchTree` 与版本链连续性**：`searchTree` 共用 `refAllocator` 并刷新 `currentRefMap`（搜到即可点），但**不**调用 `stateCache.update`，避免在未返回全量/增量快照的情况下推进 `rev` 造成宿主侧 `baseRev` 断链。
- **`webmcp-cli` 兼容**：`stateObj` 仍保持顶层平铺 JSON 且 `content` 为字符串，`webmcp-cli` 的 `formatLogResult` 原样兼容并能打印新增的 `kind` / `rev` / `baseRev` 元数据。
- **已知边界（虚拟列表就地复用 DOM）**：`ElementRefAllocator` 按 DOM `Element` 实例锚定编号，可消除节点增删引起的编号漂移及已销毁节点复用；若虚拟滚动/无 `key` 列表就地复用同一个 DOM 节点仅替换文本内容，旧 `#ref` 仍绑定到该 DOM 实例（后续可结合行上下文摘要校验进一步增强）。

## 备选方案（未采用）

- **完全移除增量 Diff（Playwright MCP 路线）**：虽然实现最简单，但在高频微交互（勾选单选框、展开下拉、填写多项表单）下每次传输数万字符全量树，在未折叠窗口内 Token 开销仍然偏高；采用「稳定编号 + 阈值熔断回退整页」兼具增量省流与剧变兜底优势。
- **每次重排编号并在 Diff 前抹除 `#ref`**：虽能缩小 Diff 文本，但 AI 在上下文中持有的旧 `#ref` 与最新 DOM 发生静默错位，极易误点错误按钮，故必须从根源将 `#ref` 绑定到 DOM 元素。
