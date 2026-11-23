# Spec：page-agent-tool 稳定元素编号与结构化增量 Diff 重构

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联 Issue：无（用户需求与调研）

## 背景

当前 `page-agent-tool` 在构建无障碍树与生成增量 Diff 时存在严重缺陷：

1. **按顺序重新从 `0` 编号导致级联 Diff 爆炸与静默误点**：每次 `buildA11yTree` 都从 `#0` 重新递增分配编号。只要在页面上方插入 1 个可交互元素，下方 N 个既有元素的 `#ref` 全部 `+1`，`diffLines` 将 2N 行全部判为删除+新增，导致单次 Diff 字符数高达整页树的 2 倍以上；且旧编号会静默漂移指向错误元素。
2. **Diff 缺乏熔断退化保护**：当页面同 URL 发生大面积重绘（如 SPA Tab 切换）时，变化行过半甚至 Diff 长度超过整页树，仍强行返回海量 `+/-` 行，浪费 Token 并加重 LLM 拼图负担。
3. **缺少快照版本协议与上下文锚点**：返回 JSON 缺少 `kind`（`full` | `diff`）、`rev`、`baseRev` 等结构化元数据，宿主无法可靠追踪或整链折叠历史快照；且多元素同时更新时 `-` 与 `+` 块分离、嵌套节点缺少最小父级定位锚点。
4. **过期编号报错不统一 & 缺少会话级重置**：`hover`、`scroll` 遇到失效 `#ref` 未返回 `isError: true`，其它操作则在报错时强塞整页树；长会话跨多轮对话缺少重置 `#ref` 分配器与 Diff 缓存的机制。

参考 Playwright MCP、Chrome DevTools MCP、Nanobrowser、browser-use 的业界实践，将 `#ref` 绑定到具体 DOM 元素实例，并在 Diff 生成端补齐同 `#ref` 就近配对、最小父级锚点、阈值熔断回退、`kind/rev/baseRev` 版本协议、统一 `REF_NOT_PRESENTED` 报错及每轮对话重置能力。

## 领域术语表

- **稳定元素编号（Stable Element Ref）**：通过 `WeakMap<Element, number>` 与单调递增计数器将 `#N` 绑定到 DOM `Element` 实例。元素存活期间 `#N` 恒定不变；元素移除后旧 `#N` 作废且不复用。
- **快照版本号（`rev` / `baseRev`）**：每次产出浏览器状态快照自增的整数版本 `rev`（从 `1` 开始）；当返回增量 `diff` 时附带 `baseRev` 标明所基于的上一版快照 `rev`。
- **Diff 熔断回退（Fallback to Full）**：当变更行数超过整页行数一半，或增量 Diff 文本体积接近/超过整页 YAML 时，自动放弃增量补丁，直接返回整页树并将 `kind` 标记为 `'full'`。

## 目标用户 / 场景

- **AI Agent / LLM**：在页面局部插入、展开菜单或状态更新时只收到极小且带结构锚点的 `+/-` Diff，不再被全局编号偏移刷屏；传错旧编号时收到明确的 `REF_NOT_PRESENTED` 错误而非误触其它元素。
- **Agent 宿主框架（上下文管理层）**：依赖结构化字段 `kind`、`url`、`rev`、`baseRev` 维护或整条折叠 Diff 链；单轮回复结束时通过 `PAGE_AGENT_CHAT_END_EVENT` 清空 Diff 基线（保持 `rev` 递增与 `#ref` 跨轮不复用），新建或清空会话时显式调用 `handle.resetSession()` 完全归零。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/a11y/build.ts` / `vnode.ts`：无障碍树构建与 `#ref` 分配
- `packages/next-sdk/page-tools/page-state-cache.ts`：页面状态缓存与 Diff 计算
- `packages/next-sdk/page-tools/page-agent-tool.ts` / `context.ts` / `handlers/*.ts`：工具执行、错误构造与事件桥
- `packages/next-sdk/page-tools/page-agent-prompt.md`：内置工具 Prompt 说明

## 范围

### In Scope

- 新增 `ElementRefAllocator`（`WeakMap<Element, number>` + 单调递增 `nextRef`），接入会话级 `registerPageAgentTool`（含 `browserState`、各交互动作与 `searchTree`）；无参独立调用 `buildA11yTree` 保持默认从 `0` 编号向后兼容。
- 保证 `refMap` 仅包含最终序列化到当前快照 YAML `lines` 中的活跃 `#ref`（消除单子合并未输出父 `#ref` 的幽灵条目）。
- 重构 `PageStateCache`：
  - 基于稳定 `#ref` 实现变更 Hunk 内同 `#ref` 的 `- / +` 就近成对输出；
  - 为嵌套层级的变更行自动补充去重后的最小父级缩进上下文锚点（`'  '` 前缀）；
  - 双重熔断保护：变化行占比 `> 50%` 或 `diffText.length >= yaml.length`（防体积倒挂）时自动回退返回整页树（`kind: 'full'`）；
  - 维护单调递增 `rev` 与增量 `baseRev`；`searchTree` 仅刷新 `currentRefMap`，不覆盖 `stateCache` 基线以保持 `rev` 链连续。
- `browserState` 返回 JSON 新增结构化字段：`kind: 'full' | 'diff'`、`rev: number`（当 `kind === 'diff'` 时含 `baseRev: number`）。
- 所有依赖 `index` 的动作（`click`、`fill`、`select`、`hover`、`scroll`）在 `index` 不在最新快照 `currentRefMap` 或元素已脱离文档（`!el.isConnected`）时，统一返回 `isError: true` + `errorCode: 'REF_NOT_PRESENTED'` 轻量结构化错误，不自动附带整页树。
- 单轮结束与会话重置：收到 `PAGE_AGENT_CHAT_END_EVENT` 时仅调用 `endTurn()`（递增代次 + `stateCache.invalidate()`，下轮出 `full` 但 `rev` 持续递增、`#ref` 不跨轮复用）；`PageAgentToolHandle` 新增可选 `resetSession()`（`registerPageAgentTool()` 返回 `RegisteredPageAgentToolHandle` 必带），由宿主在新建或清空会话时显式调用以完整归零；异步操作等待期间遇轮次结束或重置时拦截续体并返回 `SESSION_RESET`。
- 收敛校验态作用域与锚点去重（实机压测优化）：收敛 `DEFAULT_ERROR_SELECTORS` 中的宽泛 `.ng-invalid` 为已交互原生表单控件；`states.error`/`states.warning` 元素自身命中始终生效，并仅允许表单控件（原生 `input`/`textarea`/`select`、编辑宿主、经 role 解析出的 `textbox`/`combobox` 等）通过 `closest()` 继承容器校验态；`PageStateCache` 对包装层缩进平移、同父槽位 LCS 抵消及祖先锚点去重做严格处理。
- 同步更新 `page-agent-prompt.md`、`docs/webmcp-sdk/page-agent-tool.md` 与 `packages/next-sdk/skills/page-agent/SKILL.md`。

### Out of Scope

- 宿主侧（上层 Agent 仓库）的上下文窗口 token 校准、整链折叠与模型摘要逻辑。
- 修改 `inputSchema` 的外部参数名（保持 `responseMode: 'full' | 'diff' | 'both'` 完全兼容）。

## 用户故事与验收标准

1. 作为 Agent，我希望页面顶部插入新元素时下方既有元素的 `#N` 保持不变，以便 Diff 只包含真正新增的那一行。
   - 验收：400 个按钮上方插入 1 个新按钮后，原 `#0..#399` 编号不变，新按钮分配 `#400`，Diff 仅输出 `+ - button #400 ...`，体积远小于整页树。
2. 作为 Agent，我希望同一批变更中多个元素更新状态或文案时，同一 `#N` 的 `-` 与 `+` 成对紧邻，且嵌套变更带有最小父级缩进锚点，以便准确理解变更位置。
   - 验收：多按钮文本同时更新时按 `#N` 成对输出 `- 旧行` / `+ 新行`；容器内深层节点变更时输出去重后的父级上下文行（`'  '` 前缀）。
3. 作为宿主与 Agent，我希望当页面变化超过一半或 Diff 过大时自动返回整页树，并通过 `kind`、`rev`、`baseRev` 精确识别快照类型与版本链。
   - 验收：首次获取、URL 变化、`responseMode='full'` 或大面积 DOM 变更时返回 `kind: 'full', rev: N`（无 `baseRev`）；小幅变更返回 `kind: 'diff', rev: N, baseRev: N-1`。
4. 作为 Agent，我希望传入已移除或未出现在最新快照中的 `#ref` 时立即收到 `REF_NOT_PRESENTED` 错误，绝不误操作新元素。
   - 验收：移除元素后旧 `#ref` 不被新元素复用；`click`/`fill`/`select`/`hover`/`scroll(带 index)` 传入旧 `#ref` 均返回 `isError: true` 且 `errorCode === 'REF_NOT_PRESENTED'`，且响应不塞整页树。
5. 作为宿主集成方，我希望单轮回复结束时下轮返回 `full` 且不复用旧编号，新建/清空会话时能完整归零编号与版本链。
   - 验收：派发 `PAGE_AGENT_CHAT_END_EVENT` 后下一次 `browserState` 返回 `kind: 'full'`、`rev` 继续递增且旧 `#ref` 不被复用；显式调用 `handle.resetSession()` 后重新从 `#0` 和 `rev: 1 (full)` 起步；异步动作等待期间遇轮次结束或重置时返回 `errorCode: 'SESSION_RESET'` 且不污染新状态。

## 非功能要求

- **向后兼容**：直接调用 `buildA11yTree(root, config)`（不传 `refAllocator`）的行为与既有单测 100% 兼容；`webmcp-cli` 日志解析 `stateObj.content` 无损兼容。
- **内存安全**：元素映射采用 `WeakMap<Element, number>`，SPA 频繁销毁 DOM 节点不会造成内存泄漏。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现（含中文 `复现：` 回归场景）
- [x] `page-agent-prompt.md`、`docs/webmcp-sdk/page-agent-tool.md`、`packages/next-sdk/skills/page-agent/SKILL.md` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 与 `pnpm -F @opentiny/next-sdk build` 通过
