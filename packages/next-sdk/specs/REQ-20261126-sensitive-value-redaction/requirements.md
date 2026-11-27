# Spec：browserState 不输出敏感输入框的值

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：无

## 背景

`browserState` 把 `input` / `textarea` / `select` 的当前值写成 `value="…"` token，供 Agent 在 `fill` 之后从 Diff 确认写入结果。密码框、银行卡号、短信验证码的值也按原样写入，随无障碍树发给 LLM。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/a11y/config.ts`：`computeStates` 输出 `value` token
- HTML 规范 autofill 字段名：`current-password`、`new-password`、`one-time-code`、`cc-number`、`cc-csc`、`cc-exp`、`cc-exp-month`、`cc-exp-year`
- Claude in Chrome 的页面读取工具对敏感字段输出 `[value redacted]` 占位

## 范围

### In Scope

- 敏感输入框有值时，`value` token 输出占位 `[已脱敏]`，不输出原值。
- 敏感输入框的判定：`input[type=password]`，或 `autocomplete` 属性含上述任一字段名。
- 空值时与现状一致，不输出 `value` token。

### Out of Scope

- 页面上以普通文本显示的卡号、手机号等内容。
- 未声明 `type=password` 也未声明上述 `autocomplete` 的输入框（例如用普通文本框收密码的页面）。
- `executeJavascript` 返回值、`fill` 的入参（入参来自 LLM 本身）。
- 新增配置项（本 Spec 不提供关闭脱敏或自定义判定的开关）。

## 用户故事与验收标准

1. 作为集成方，我希望密码、银行卡、验证码的值不出现在发给 LLM 的页面状态里。
   - 验收：上述字段有值时，`buildA11yTree` 的 YAML 不含原值，含 `value="[已脱敏]"`，仍保留可访问名与 `#N`。
2. 作为 Agent，我希望 `fill` 敏感字段后仍能从 Diff 判断已经填写。
   - 验收：空密码框不输出 `value`；写入值后输出 `value="[已脱敏]"`。
3. 作为 Agent，我希望普通输入框的值照常可见。
   - 验收：`autocomplete="name"` 等非敏感字段仍输出原值。

## 非功能要求

- 不新增公开 API 或配置项。
- 不改变非敏感输入框、contenteditable 编辑宿主的 `value` 输出。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] `docs/webmcp-sdk/page-agent-tool.md` 与 `skills/page-agent/SKILL.md` 已更新
- [x] `pnpm -F @opentiny/next-sdk test` 通过
