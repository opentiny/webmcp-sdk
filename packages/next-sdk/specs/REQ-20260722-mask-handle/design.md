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

`registerPageAgentTool` 通过 `acquireSimulatorMask()` 获取遮罩：`window.__pageAgentSimulatorMask` 存在且其 `wrapper` 仍在文档中时直接复用，否则对旧实例调用 `dispose()`（移除其 `window` 监听并停止动画循环），再新建并写回。句柄方法在每次调用时读取 `window.__pageAgentSimulatorMask`，因此遮罩被替换后，先前句柄仍作用于当前实例。`SimulatorMask` 记录 `hide()` 的淡出定时器，`show()` 与 `dispose()` 会取消它，避免共用遮罩在淡出期间被重新显示后又被定时器隐藏。

实例挂在 `window` 而不是模块作用域，是为了让页面中多份 SDK 副本（页面自身打包一份、宿主再注入一份）共用同一个遮罩。

## 风险与兼容

- 仅新增返回值与类型导出，现有调用方均丢弃返回值，无破坏性变更。
- 句柄方法不读取 `removeMaskAfterToolCall`，公开 API 为显式控制。
- 遮罩复用后，先前句柄的 `showMask()` / `hideMask()` 作用于当前遮罩，而不是已失去工具的旧实例；这是本次修复的目标行为。
- 被后续注册取代、仍在执行的工具调用，结束时的收尾（移除目标边框、收起光标、`removeMaskAfterToolCall` 关闭遮罩）同样作用于共用遮罩。这里不判断调用归属：这些收尾只会隐藏视觉元素，不会让遮罩保持显示。
- 跨副本复用依赖 `SimulatorMask` 的公开方法保持兼容；不写入该全局的旧版本副本仍会各自新建遮罩，行为与修复前一致。
