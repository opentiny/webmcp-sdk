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

## 遮罩实例复用（验收标准 3）

`registerPageAgentTool` 通过 `acquireSimulatorMask()` 获取遮罩：`window.__pageAgentSimulatorMask` 存在且其 `wrapper` 仍在文档中时直接复用，否则新建并写回。实例挂在 `window` 而不是模块作用域，是为了让页面中多份 SDK 副本（页面自身打包一份、宿主再注入一份）共用同一个遮罩。

## 风险与兼容

- 仅新增返回值与类型导出，现有调用方均丢弃返回值，无破坏性变更。
- 句柄方法不读取 `removeMaskAfterToolCall`，公开 API 为显式控制。
- 遮罩复用后，先前句柄的 `showMask()` / `hideMask()` 作用于当前遮罩，而不是已失去工具的旧实例；这是本次修复的目标行为。
- 跨副本复用依赖 `SimulatorMask` 的公开方法保持兼容；不写入该全局的旧版本副本仍会各自新建遮罩，行为与修复前一致。
