# Spec：tasks.md — next-remoter 对接 TinyRobot chat 套件

每个任务可独立验收；行为变更任务含测试子项。测试放 `packages/next-remoter/test/`。

## 任务列表

- [x] Task 1: PoC（决定方案 B / C）
  - 产物：独立分支 + 最小 demo：`TrChat` + `useChatRuntimeFromConversation` + next-sdk Agent 流式写回
  - 验证 4 点：流式 send、GenUI `schema-card` 渲染器、悬浮/全屏 `floatingState`、附件/语音是否内置
  - 验证 pnpm 下 tiny-robot 单份解析（`pnpm why @opentiny/tiny-robot`）
  - 产物：结论写回 `design.md` 的「待定」项
- [x] Task 2: 依赖升级
  - `pnpm-workspace.yaml` catalog：`@opentiny/tiny-robot{,-kit,-svgs}` → `1.0.0-rc.2`，新增 `@opentiny/tiny-robot-chat: 1.0.0-rc.2`
  - `package.json`（remoter）加依赖；`src/index.ts` 引入 chat 样式
  - [x] 测试：`pnpm build` 通过
- [x] Task 3: 新增 `composable/useRemoterRuntime.ts`
  - 子任务：conversation / send（Agent 流）/ model / mcp / beforeSend
  - [x] 测试：`test/useRemoterRuntime.test.ts`（mock Agent；断言流式追加、abort、切换会话、beforeSend 拦截识别码）通过
- [x] Task 4: 缩减 `CustomAgentModelProvider` / `usePlugin` / `usePluginSession`
  - 接入套件标准 `AsyncGenerator<ChatCompletion>` 桥接，保留扫码、识别码、遥控器
  - [x] 测试：`test/mcp-runtime.test.ts`（toggleTool、deletePlugin 与 `enabledTools` v-model 同步）通过
- [x] Task 5: 重写 `TinyRobotChat.vue` 为薄壳（≤300 行）
  - props/emits/slots/expose 按 `design.md` 登记表实现
  - 彻底委托 `<TrChat :runtime="runtime" :ui="chatUIOptions">`
  - [x] 测试：`test/TinyRemoter.test.ts`（导出契约、props 声明测试）通过
- [x] Task 6: 删除冗余文件（`useTinyRobotChat` / `useConversationHistory` / `useMessageRoles` / `ModelSwitch` / `PluginToggleButton` / `CustomAgentModelProvider` 等）
  - [x] 测试：`pnpm build` + `vue-tsc` 无残留引用
- [x] Task 7: GenUI / 多模态 / 提示词适配
  - [x] 实现：GenUI 渲染器与套件 `contentRendererMatches` 匹配，内置 Thinking 折叠与 Tool Calls 原生展示
- [x] Task 8: 文档与变更登记
  - 更新 `README.md`，新增“对接 TinyRobot 1.0 Chat 套件”架构与迁移章节
  - `design.md` 登记表定稿
- [x] Task 9: 回归与测试门禁
  - 清单：对话/流式/中断、会话历史增删改切、模型配置同步、MCP 启停与工具开关、扫码/识别码拦截
  - 验收通过：`pnpm -F @opentiny/next-remoter test`、`pnpm test`、`pnpm pr-gate` 全部通过

## 依赖顺序

1 → 2 → 3 → 4 → 5 → (6, 7) → 8 → 9

## 验收命令

```bash
pnpm install
pnpm -F @opentiny/next-remoter build
pnpm -F @opentiny/next-remoter test
pnpm test
pnpm pr-gate
```
