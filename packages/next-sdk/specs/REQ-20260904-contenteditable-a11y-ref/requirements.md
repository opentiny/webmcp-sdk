# Spec：无障碍树识别 contenteditable 编辑宿主

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联 Issue：无（用户口头需求）

## 背景

`page-agent-tool` 的 `fill` 已能对 `input`、`textarea` 以及任意 `contenteditable` 元素写入文本（`handleFill` → `inputTextElement`）。但 `browserState` 构建无障碍树时：

1. `div[contenteditable]` 等非表单标签隐式角色是 `generic`；
2. `isMeaningfullyInteractive` 会把「generic 且无 pointer 手势」的可聚焦节点当成结构焦点容器滤掉；
3. `isSemanticInteractiveTag` 只覆盖 `a/button/input/select/textarea`。

因此富文本编辑区（常见于知乎、CSDN、各类 CMS）在 YAML 中没有 ref，Agent 无法把 `fill` 对上目标。

## 领域术语表

- **编辑宿主（editing host）**：元素**自身**声明了 `contenteditable="true"` / `""` / `"plaintext-only"`，而非仅从祖先继承。对应 IDL `contentEditable === 'true' | 'plaintext-only'`。
- **继承可编辑子孙**：父级是编辑宿主时，子节点 `contentEditable === 'inherit'` 且 `isContentEditable === true`。它们不是独立填写目标，不得各分一个 ref。

## 目标用户 / 场景

- Agent 调用 `browserState` 后，在 YAML 中看到富文本编辑区为 `textbox #N [contenteditable]`，再用 `fill` 填写。
- 集成方无需为每个站点的编辑器单独写 `whitelist` / `roles`。

## 参考资料 / 上下文

- HTML-AAM：编辑宿主隐式 ARIA 角色为 `textbox`
- `packages/next-sdk/page-tools/handlers/fill.ts`：已支持 contenteditable
- `packages/next-sdk/page-tools/a11y/vnode.ts`：ref 分配
- `packages/next-sdk/page-tools/a11y/config.ts`：`computeRole` / `computeStates`

## 范围

### In Scope

- 识别编辑宿主：隐式角色 `textbox`（显式 `role` / `roles` 规则 / `input[type]` 优先）。
- 为未禁用的编辑宿主分配 ref，写入 `refMap`，YAML 输出 `#N`。
- 输出 `contenteditable` token（`plaintext-only` 时为 `contenteditable=plaintext-only`）。
- 有可见文本时输出 `value="…"` token（与 input/textarea 一致，供 fill 后 Diff）。
- 继承可编辑子孙、`contenteditable="false"` 不因可编辑性获得 ref。
- 用户文档 / Skill / `fill` schema 描述同步。

### Out of Scope

- 修改 `handleFill` 的写入实现（已支持 contenteditable）。
- 为编辑宿主截断超长 `value`（与 input/textarea 现状对齐，不新增截断）。
- 暴露新的公开配置项或 `PageAgentToolOptions` 字段。
- 识别无 `contenteditable` 属性、仅靠 iframe/CodeMirror 等内容的第三方编辑器。

## 用户故事与验收标准

1. 作为 Agent，我希望 `div[contenteditable=true]` 出现在无障碍树中并带 ref，以便对它调用 `fill`。
   - 验收：`buildA11yTree` 的 `refMap` 包含该元素；YAML 含 `textbox #<n>` 与 `[contenteditable]`。
2. 作为 Agent，我希望空的编辑宿主也有 ref，以便向空白富文本框填写。
   - 验收：空 `div[contenteditable]` 仍进入 `refMap`。
3. 作为 Agent，我希望只给编辑宿主本身分配 ref，而不是每个内部 `<p>`/`<span>` 各一个。
   - 验收：宿主在 `refMap` 中；仅继承可编辑的子孙不在 `refMap` 中。
4. 作为 Agent，我希望 `contenteditable="false"` 不被当成可填字段。
   - 验收：该元素不因可编辑性获得 ref（除非另有 button 等交互语义）。
5. 作为 Agent，我希望 `plaintext-only` 同样可填，并能从 token 区分模式。
   - 验收：角色 `textbox`、有 ref、token 含 `contenteditable=plaintext-only`。
6. 作为集成方，我希望显式 `role` 不被 contenteditable 覆盖。
   - 验收：`<div role="combobox" contenteditable="true">` 角色仍为 `combobox`，但仍有 ref 与 `contenteditable` token。

## 非功能要求

- 不新增公开 API 符号（`isEditingHost` 仅模块内导出，不进包入口）。
- 不改变 input/textarea 既有角色与 ref 行为。
- `aria-disabled="true"` 的编辑宿主不分配 ref（与其它交互角色一致）。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/page-agent-tool.md` 与 `skills/page-agent/SKILL.md` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 通过
