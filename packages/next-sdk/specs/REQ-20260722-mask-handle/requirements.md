# Spec：registerPageAgentTool 暴露 mask 显隐句柄

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联 PR：opentiny/webmcp-sdk#520

## 背景

`registerPageAgentTool` 内部持有一份 `PageController`，但此前无返回值，宿主页面无法在非工具调用时机主动控制 mask。本次开放最小句柄，把已有的 `showMask/hideMask` 透出。

## 范围

### In Scope

- `registerPageAgentTool` 返回 `{ showMask, hideMask }`。
- 新增并导出 `PageAgentToolHandle` 类型。

### Out of Scope

- mask 行为 / 配置项变更。
- 调用方接入（各包按需消费）。

## 验收标准

1. `const h = registerPageAgentTool(); await h.showMask(); await h.hideMask();` 正常工作。
2. `PageAgentToolHandle` 类型可从 `@opentiny/next-sdk` 导入，`tsc --noEmit` 无报错。
