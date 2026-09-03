# Spec：遮罩接管态与光标生命周期分离

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联 Issue：无（用户口头 / 架构评审需求）
- 前序 Spec：[`REQ-20260810-mask-cursor-split`](../REQ-20260810-mask-cursor-split/)（引入 `showCursor`，但默认值写反）

## 背景

`REQ-20260810` 已将呼吸灯与鼠标图标分层，但宿主在「准备中 / 思考中」接管 Tab 时仍会看到光标，根因有四处断层：

1. **`PageAgentToolHandle.showMask()` 无法传参**，且内部落到 `SimulatorMask.show()` 时 `options?.showCursor ?? true`，无参即露光标。
2. **`#createCursor()` 未设 `display: 'none'`**，wrapper 一旦 `.visible`，光标以 `(0, 0)` 瞬时露出。
3. **操作类 action 的 `finally` 只 `removeBorderElement()`**，不收起光标；宿主保持遮罩期间光标停在上次点击位置。
4. **缺少运行期策略配置**，扩展宿主无法声明「仅操作时出光标 / 永远不出 / 始终出」。

遮罩（Mask）语义是呼吸灯锁屏防误触；光标（Cursor）语义是操作动效。开启接管态 ≠ 正在鼠标操作。

## 领域术语表

- **接管态**：宿主（Sidepanel / 子 Agent）对当前 Tab 调用 `showMask()`，展示呼吸灯并拦截误触。
- **操作类 Action**：`click` / `fill` / `select` / `hover`，需要光标移动到目标。
- **感知/脚本/滚动类 Action**：`browserState` / `searchTree` / `executeJavascript` / `scroll`，只需呼吸灯。
- **`cursorMode`**：运行期光标策略。`actionOnly`（默认）仅操作类展示；`always` 遮罩可见即展示；`never` 永不展示。

## 目标用户 / 场景

- 扩展宿主在 lockTask / beginTaskSession 时只需呼吸灯，初始化与思考阶段不得出现鼠标。
- 最终用户观察 AI 点击/填写时，光标仅在该步骤期间出现，步骤结束后收回。
- 集成方可通过 `cursorMode` 覆盖默认策略。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/page-agent-mask/SimulatorMask.ts`
- `packages/next-sdk/page-tools/page-agent-tool.ts`（`PageAgentToolHandle`、`executePageAgentTool`）
- `packages/next-sdk/page-tools/tool-config.ts`
- 前序：`specs/REQ-20260810-mask-cursor-split/`、`specs/REQ-20260722-mask-handle/`

## 范围

### In Scope

- `SimulatorMask.#createCursor()` 初始 `display: 'none'`。
- `SimulatorMask.show()` 默认 `showCursor: false`（破坏性默认值修正）。
- `PageAgentToolHandle.showMask(options?)` 透传 `{ showCursor?: boolean }`，内部直调 `simulatorMask.show`（不经无参的 `pageController.showMask()`）。
- 操作类 Action 结束后，若遮罩仍显示且 `cursorMode !== 'always'`，自动 `show({ showCursor: false })`。
- `PageAgentToolConfig.cursorMode`：`'actionOnly' | 'always' | 'never'`，默认 `'actionOnly'`。
- 对应单元测试与用户文档。

### Out of Scope

- 修改 `@page-agent/page-controller` 的 `showMask`/`hideMask` 签名。
- 改无障碍树 / 序列化 / 工具协议。
- 改呼吸灯视觉或光标 SVG。

## 用户故事与验收标准

1. 作为宿主，我在初始化阶段调用无参 `handle.showMask()`，只看到呼吸灯、看不到鼠标。
   - 验收：无参 `showMask()` → `simulatorMask.show({ showCursor: false })`（`cursorMode: 'actionOnly'` 默认）。
2. 作为用户，遮罩刚变为 visible 时，光标节点已是 `display: none`，不会闪在左上角。
   - 验收：`#createCursor()` 后、以及 `show()` 未传 / `showCursor: false` 时，`.webmcp-page-agent-cursor` 的 `style.display === 'none'`。
3. 作为用户，click/fill/select/hover 执行完毕后，若遮罩仍开着且 `cursorMode !== 'always'`，光标应收起，只留呼吸灯。
   - 验收：`executePageAgentTool` 的 `finally` 在 `shown === true` 且非 `always` 时再调 `show({ showCursor: false })`。
4. 作为集成方，我可以设 `cursorMode: 'never'` 让任何路径都不出光标；设 `'always'` 则未传 `showCursor` 时遮罩期间保持光标。
   - 验收：配置读写经 `get/setPageAgentToolConfig`；调度层按策略解析 `showCursor`。
5. 作为宿主，我仍可显式 `showMask({ showCursor: true })` 强制出光标（`never` 除外，全局关闭优先）；`always` 下仍可用 `showMask({ showCursor: false })` 临时隐藏。

## 非功能要求

- 无参 `showMask()` 的调用方无需改代码即可获得「仅呼吸灯」行为（默认值修正，有意不向后兼容旧的「无参即出光标」）。
- 新增可选参数与 `cursorMode` 字段，不删除既有配置项。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现（含中文「复现：」）
- [x] `docs/webmcp-sdk/page-agent-tool.md` 与 `skills/page-agent/SKILL.md` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 与 `pnpm -F @opentiny/next-sdk build` 通过
