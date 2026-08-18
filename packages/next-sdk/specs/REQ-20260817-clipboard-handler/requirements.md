# Spec：Page Agent 剪切板读写（clipboard action）

## 元信息

- 状态：已交付（代码已实现，Spec 事后补建）
- 主责包：`packages/next-sdk`
- 关联 Issue：（无强制 Issue）

## 背景

Page Agent 在执行页面自动化时，需要与系统剪切板交互：将 Agent 生成或页面上的文本写入剪切板供用户粘贴，或读取用户已复制的内容作为后续操作的上下文。此前 `page-agent-tool` 的 `action` 枚举未覆盖该能力；现通过独立 handler 与 schema 描述接入。

## 领域术语表

- **clipboard action**：`PageAgentToolInput.action === 'clipboard'` 时的工具调用分支，不依赖元素 `index`。
- **text 语义分叉**：`text` 有非空字符串时写入剪切板；未提供或为空时读取剪切板当前文本。

## 目标用户 / 场景

- Agent 将摘要、代码片段、表单值等复制到系统剪切板，提示用户手动粘贴到外部应用。
- Agent 读取用户已复制文本，用于填充、比对或回答「剪切板里是什么」类问题。
- 集成方通过既有 `registerPageAgentTool` 注册即可获得能力，无需额外配置。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/handlers/clipboard.ts`：`handleClipboard`
- `packages/next-sdk/page-tools/page-agent-tool.ts`：`case 'clipboard'`
- `packages/next-sdk/page-tools/schema.ts`：`action` / `text` 字段描述
- 浏览器 API：`navigator.clipboard.readText` / `writeText`（需安全上下文与用户授权）

## 范围

### In Scope

- 新增 `action: 'clipboard'` 及对应 handler。
- `text` 有值 → `navigator.clipboard.writeText(text)`，返回成功文案。
- `text` 无值 → `navigator.clipboard.readText()`，返回前缀为「剪切板内容为: 」的文本。
- 异常捕获后返回「操作剪切板失败: …」文本结果（不抛未处理异常）。
- 执行 clipboard 时不展示 SimulatorMask（与 click/fill 等区分）。

### Out of Scope

- 富文本、图片等非纯文本剪切板格式。
- `navigator.clipboard` 不可用时的 DOM fallback（`dom-inspect` 有独立实现，本 handler 不重复）。
- 主动请求 Permissions API 或引导用户授权 UI。
- 修改 `PageAgentToolOptions` 或其它公开配置类型。

## 用户故事与验收标准

1. 作为 Agent，我希望传入 `text` 时把内容写入系统剪切板，以便用户粘贴到别处。
   - 验收：`{ action: 'clipboard', text: 'hello' }` → 调用 `writeText('hello')`，返回「复制到剪切板成功」。
2. 作为 Agent，我希望不传 `text` 时读取当前剪切板纯文本。
   - 验收：`{ action: 'clipboard' }`（无 `text`）→ 调用 `readText()`，返回「剪切板内容为: \<内容\>」。
3. 作为集成方，我希望剪切板权限被拒或 API 抛错时不导致工具调用崩溃。
   - 验收：`readText` / `writeText` reject → 返回 `操作剪切板失败: \<message\>`，结构仍为 `{ content: [{ type: 'text', text }] }`。
4. 作为用户，我不希望读写剪切板时弹出 SimulatorMask 遮挡页面。
   - 验收：`case 'clipboard'` 分支不调用 `simulatorMask.show`。

## 非功能要求

- 依赖浏览器 Clipboard API；非安全上下文（非 HTTPS 等）可能失败，通过错误文案暴露原因。
- handler 为纯异步函数，不修改 `ActionContext` / `refMap`。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 自动化测试已实现（见 `tasks.md` Task 3）
- [x] `docs/webmcp-sdk/page-agent-tool.md` 与 `skills/page-agent/SKILL.md` 补充 clipboard 说明
- [x] `pnpm -F @opentiny/next-sdk test` 无回归
