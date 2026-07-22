# Design：registerPageAgentTool 暴露 mask 显隐句柄

## 方案概述

在 `registerPageAgentTool` 末尾返回 `{ showMask, hideMask }`，箭头函数透传到内部 `pageController` 的同名方法；新增 `PageAgentToolHandle` 类型并从入口导出。

## 涉及文件

- `packages/next-sdk/page-tools/page-agent-tool.ts`：新增类型、声明返回类型、返回句柄。
- `packages/next-sdk/index.ts`：`export type { PageAgentToolHandle }`。

## API / 行为变更

| 符号或行为                       | 变更类型 | 说明                             |
| -------------------------------- | -------- | -------------------------------- |
| `registerPageAgentTool()` 返回值 | 新增     | 由 `void` 改为 `PageAgentToolHandle`，向后兼容 |
| `PageAgentToolHandle` 类型       | 新增     | 从包入口导出                     |

## 风险与兼容

- 仅新增返回值与类型导出，现有调用方均丢弃返回值，无破坏性变更。
- 句柄方法不读取 `removeMaskAfterToolCall`，公开 API 为显式控制。
