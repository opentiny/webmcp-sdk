# Spec: tasks.md 任务清单

每个任务应可独立验收；涉及行为变更的任务必须含测试子项。

## 任务列表

- [x] Task 1: 依赖配置更新与工作区环境同步
  - 输入：`pnpm-workspace.yaml`, `packages/next-remoter/package.json`
  - 产物：更新工作区 catalog 与包依赖，引入 `@opentiny/tiny-robot-chat@0.5.2-alpha.16` 并对齐版本
  - [x] 验收：`pnpm install` 成功，依赖解析正常

- [x] Task 2: 基于 tiny-robot-chat 重构 TinyRobotChat.vue
  - 输入：`packages/next-remoter/src/components/TinyRobotChat.vue`, `packages/next-remoter/src/index.ts`
  - 产物：使用 `TrChat` 作为基础容器，重构模版与插槽映射，保留全部 Props、v-model、Emits、Slots 与 17 项 Expose
  - [x] 测试：`packages/next-remoter/test/tiny-remoter.spec.ts`

- [x] Task 3: 完善 WebMCP 与 WebSkills 扩展能力对接
  - 输入：`src/composable/useSkill.ts`, `src/composable/usePlugin.ts`, `src/composable/useTinyRobotChat.ts`
  - 产物：验证与调整 WebMCP 插件同步机制与 WebSkills 动态激活机制，确保在 tiny-robot-chat 下正常工作
  - [x] 测试：WebMCP 动态发现/执行与 WebSkills 技能注册测试

- [x] Task 4: 自动化测试用例建设与全量构建验收
  - 输入：主责包 `packages/next-remoter/test/`
  - 产物：包含 API 签名契约测试、插槽透传测试、Expose 完整性测试、WebMCP/WebSkills 扩展机制测试
  - [x] 测试执行：`pnpm --filter @opentiny/next-remoter test` 与 `pnpm --filter @opentiny/next-remoter build`

- [x] Task 5: 消息流解析渲染与界面自适应修复
  - 输入：`useTinyRobotChat.ts`, `TinyRobotChat.vue`
  - 产物：将 uiContent 内容同步转接至 message.content；将 leftAside 设为抽屉模式消除多余侧边栏；移除手写 layout-header，全面复用 TrChat 原生 Header 抽屉切换与新建会话；保护原生发送按钮；补充 Markdown 表格与 Prompts 自适应样式
  - [x] 验收：通过无头浏览器与真实 LLM 交互验证，打字与流式回复完全恢复，抽屉自然滑出与管理会话，单测构建通过

- [x] Task 6: AI 输出样式优化与工具文本剔除
  - 输入：`useTinyRobotChat.ts`
  - 产物：移除在回复正文中暴力硬编码拼接 `> 🛠️ 工具调用 ...` 的纯文本引用，保持大模型 Markdown 输出排版纯净连贯；对思维链（Reasoning）首尾空白与空行做 trim 净化，使思考内容首行精准对齐时间线圆点
  - [x] 验收：端到端真实交互截图验证，正文 Markdown 与思考卡片视觉干净优美，单测与 build 100% 通过

## 依赖顺序

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6

## 验收命令

```bash
pnpm --filter @opentiny/next-remoter test
pnpm --filter @opentiny/next-remoter build
```


