# Spec：遮罩效果拆分 —— 呼吸灯与鼠标图标分层控制

## 元信息

- 状态：开发中
- 主责包：`packages/next-sdk`
- 关联 Issue：无（用户口头需求）

## 背景

`SimulatorMask` 中的呼吸灯动效（ai-motion 炫彩边框）与鼠标图标（AI Cursor 箭头）目前总是绑定在一起，`show()` 时两者同时出现。但不同 action 对视觉反馈的需求不同：

- **感知/脚本类 action**（`browserState`、`searchTree`、`executeJavascript`）：Agent 在"读取"或"执行"，无需移动鼠标图标，只需呼吸灯提示 AI 在工作。
- **滚动类 action**（`scroll`）：滚动操作无具体目标坐标，显示静止鼠标图标无意义，仅呼吸灯即可。
- **精准操作类 action**（`click`、`fill`、`select`、`hover`）：需完整展示呼吸灯 + 鼠标图标（含指针移动和点击波纹），让用户观察 AI 的具体操作位置。

当前还有一个缺漏：`hover` 操作完全没有调用 `showMask()`，与 `click`/`fill`/`select` 不一致。

## 目标用户 / 场景

- 使用 `registerPageAgentTool()` 接入 page-agent 的开发者和最终用户
- 观察 AI 自动操作页面过程的用户

## 范围

### In Scope

- `SimulatorMask.show()` 新增 `showCursor` 选项，可独立隐藏鼠标图标
- `SimulatorMask` 新增 `showCursorOnly()` / 改造为 `showBreathingOnly()` 便捷方法（或直接由调度层控制）
- `page-agent-tool.ts` 调度层按 action 分两类调用遮罩
- `hover` 补齐 `showMask` + 目标元素 border 高亮
- 对应单元测试

### Out of Scope

- 修改 `@page-agent/page-controller` 的 `showMask`/`hideMask` 签名（外部包）
- 修改 `a11y-tree`、序列化或工具协议

## 用户故事与验收标准

1. 作为用户，当 Agent 执行 `browserState`/`searchTree`/`executeJavascript` 时，我只看到呼吸灯动效，不出现鼠标图标
   - 验收：`SimulatorMask.show({ showCursor: false })` 不渲染 cursor 元素
2. 作为用户，当 Agent 执行 `scroll` 时，我只看到呼吸灯，不出现静止鼠标图标
   - 验收：`scroll` action 调用 `simulatorMask.show({ showCursor: false })`
3. 作为用户，当 Agent 执行 `click`/`fill`/`select`/`hover` 时，同时看到呼吸灯和鼠标图标移动到目标元素
   - 验收：`hover` 补调 `showMask()`，`borderTargetElement` 对 hover 也生效

## 完成定义

- [x] `requirements.md` / `design.md` / `tasks.md` 已齐
- [x] 对应单元测试已在 `tasks.md` 列出并实现
- [x] `pnpm test` (201 tests passed)
- [x] `pnpm -F @opentiny/next-sdk build` 通过
