# Spec：requirements.md — next-remoter 对接 TinyRobot chat 套件

## 元信息

- 状态：草稿
- 主责包：`packages/next-remoter`
- 关联 Issue：opentiny/webmcp-sdk#559（对接 TinyRobot 最新的 chat 套件）

## 背景

TinyRobot 推出 chat 套件 `@opentiny/tiny-robot-chat`（`1.0.0-rc.1/rc.2`，文档：https://sonyleo.github.io/tiny-robot/alpha/suites/quick-start.html）。
套件提供 `TrChat` / `TrChatUI` + `useChatRuntime` / `useChatRuntimeFromConversation`，已内置：
容器/布局、历史会话、欢迎页+prompts、气泡列表、sender、模型选择、MCP 面板、扩展管理、右侧栏。

现状 `next-remoter` 自行拼装 `tr-container + tr-bubble-list + tr-sender + TrHistory + TrMcpServerPicker + ModelSwitch ...`，
`src` 约 5500 行（`TinyRobotChat.vue` 858 行 + 十余个 composable），升级 TinyRobot 时每次都要跟进。

**目标：remoter 只保留 next-sdk 特有能力（Agent 流、MCP 接入、遥控器/扫码、GenUI、skills），UI 与会话/模型/MCP 面板状态机全部交给 chat 套件。代码越少越好。**

## 参考资料

- `packages/next-remoter/src/components/TinyRobotChat.vue`（现入口，props/emits/expose 即对外 API）
- `packages/next-remoter/src/composable/CustomAgentModelProvider.ts`（534 行，Agent ↔ tiny-robot-kit Provider 适配）
- `packages/next-remoter/src/index.ts`、`README.md`、`docs/guide/tiny-robot-remoter.md`
- `@opentiny/tiny-robot-chat@1.0.0-rc.2` 的 `dist/index.d.ts`（`ChatRuntime`、`ChatUIOptions`、`ChatUISlots`、`ChatMcpRuntime`、`ChatModelRuntime`）

## 范围

### In Scope

- `TinyRemoter` 内部改为以 `TrChat` 为壳，通过 `ChatRuntime` 把 next-sdk Agent 接进去
- 删除 remoter 自研的：历史抽屉、模型切换、MCP 选择器 UI 胶水、气泡 role 配置、多模态附件 UI（若套件已覆盖）
- 对外 API 尽量兼容；不合理处改造并 **逐条登记**（见 `design.md`「API 变更登记表」）
- 升级 `@opentiny/tiny-robot*` catalog 版本（当前 `0.3.1-alpha.6` → `1.0.0-rc.x`），新增 `@opentiny/tiny-robot-chat`

### Out of Scope

- Agent / MCP / WebMCP 协议本身（`@opentiny/next-sdk`）不改
- GenUI 渲染内核不改，仅换挂载方式
- `next-wxt` 的适配（仅在 tasks 中做回归验证，不改业务）

## 用户故事与验收标准

1. 作为 remoter 使用者，升级后原有 `<TinyRemoter ... />` 的主流用法（`sessionId`、`llmConfigs`、`mcpServers`、`skills`、`mode`）无需改动即可工作。
   - 验收：README 示例原样运行；`pnpm test` 通过。
2. 作为维护者，希望 remoter 业务代码量显著下降。
   - 验收：`src` 非 svg/md 代码行数 ≤ 现状 40%（目标 ≤ 2200 行），`TinyRobotChat.vue` ≤ 250 行。
3. 作为维护者，希望所有对外 API 改动可追溯。
   - 验收：`design.md` 登记表覆盖每个 props / emits / slots / expose / 导出符号的“保留/改造/废弃”结论，且 README 有迁移说明。
4. 作为用户，聊天、会话历史、模型切换、MCP 启停、GenUI 渲染、多模态、遥控器扫码行为与现状一致。
   - 验收：`tasks.md` 的功能对照清单逐项通过（含浏览器实机）。

## 非功能要求

- chat 套件为 rc 版，**锁定精确版本**；适配层集中在单文件，便于跟随升级
- 样式：沿用套件 CSS 变量；删除 `TinyRobotChat.vue` 中 scoped less
- 打包产物体积不显著增加（对比 `dist/` 大小）

## 完成定义

- [ ] `design.md` / `tasks.md` 已齐
- [ ] 自动化测试已在 `tasks.md` 列出并实现
- [ ] README / `docs/guide/tiny-robot-remoter.md` 增加迁移说明
- [ ] 变更登记表与最终实现一致
