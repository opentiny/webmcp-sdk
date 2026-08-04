# Spec：Recorder → 扩展侧 WebMCP 自动化工具

## 元信息

- 状态：已交付
- 主责包：`packages/next-wxt`
- 关联 Issue：—

## 背景

用户可用 Chrome DevTools Recorder 导出 Puppeteer 脚本沉淀工作/生活中的自动化流程。需要在 next-wxt 中把此类脚本转化为可复用、可参数化、可在线编辑的 WebMCP 工具；执行使用扩展侧已有的 `puppeteer-core`（`ExtensionTransport`），**不**注入页面 MAIN world，也**不**自研 puppeteer DOM 兼容层。

## 领域术语表

- **Recorder 脚本**：Chrome Recorder 导出的 Puppeteer（含 `Locator.race`、offset click 等）源码
- **Recorder WebMCP 工具**：存储在独立 storage 中的结构化自动化工具，由侧栏按当前激活页 `@match` 注册
- **步骤（steps）**：结构化操作序列（goto / click / type …）；字面量可绑定为工具参数
- **扩展侧执行**：通过 `puppeteer-core` 连接当前激活 tab 执行 steps，不进入 MAIN world

## 目标用户 / 场景

1. 扩展用户：粘贴 Recorder 脚本，经 Skill 转化为专用工具后，在匹配站点由 Agent 调用
2. 进阶用户：在 Options 中在线修改选择器、参数、步骤与 `@match`
3. Agent：仅看见**当前激活页**匹配到的 Recorder 工具（与现有页面工具刷新节奏一致）

## 参考资料 / 上下文

- 用户 MCP 脚本（独立、勿混存）：`user-mcp-scripts/`、`REQ-20260730-user-mcp-scripts`
- 侧栏工具与激活页同步：`entrypoints/sidepanel/mcpServer.ts`、`extraTools.ts`
- puppeteer 连接：`entrypoints/sidepanel/utils/snapshotManager.ts` / `snapshotManagerPool.ts`
- Skills：`skills/`、`utils/skills-unified.ts`

## 范围

### In Scope

- 独立模块 `recorder-webmcp/`（types / storage / resolve / template / params / runtime / index）
- Options 新 Tab：CRUD、启用开关、编辑元信息 / `inputSchema` / steps（JSON）、导入导出 JSON
- Sidepanel：按激活 tab URL `@match` 注册/卸载；`execute` 用 puppeteer-core 跑 steps
- 内置落盘工具（供 Skill/Agent 写入）：`recorder_webmcp_save`
- Skill：`skills/recorder-to-webmcp/SKILL.md`（粘贴脚本 → 结构化工具 → 调用 save）
- 单测：storage / resolve / params / 步骤参数替换
- 用户文档简要说明（`docs/ai-extension/next-wxt.md`）

### Out of Scope

- MAIN world 注入 / puppeteer DOM 兼容层
- 改造 `user-mcp-scripts` 存储或注入链路
- 完整可视化步骤编排器（MVP 以 JSON 编辑 steps）
- 覆盖 Recorder 全部方言（MVP：setViewport / goto / click / hover / scroll / type|fill）

## 用户故事与验收标准

1. 作为用户，我希望把 Recorder Puppeteer 脚本经 Skill 转成工具并落盘，以便 Agent 复用。
   - 验收：通过 `recorder_webmcp_save` 或 Options 新建后，storage 中有结构化工具；匹配站点侧栏可见该工具。

2. 作为用户，我希望在 Options 在线编辑工具（含 steps / 参数 / `@match`），以便修正选择器与文案参数。
   - 验收：保存后切到匹配页，侧栏工具描述与执行行为反映最新定义。

3. 作为用户，我希望仅当前激活页加载匹配工具，以便与现有 WebMCP 体验一致。
   - 验收：切到不匹配 URL 的 tab 后，该 Recorder 工具从侧栏工具列表消失；切回匹配页再出现。

4. 作为 Agent，我希望 type/fill 等输入类及 Skill 判定需参数化的字面量变成 `inputSchema` 参数。
   - 验收：执行时传入参数可替换步骤中的绑定值；未绑定字面量保持常量。

5. 作为开发者，模块与 `user-mcp-scripts` / skills-storage 解耦。
   - 验收：独立 storage key；核心逻辑仅在 `recorder-webmcp/`；Options/sidepanel 仅薄适配。

## 非功能要求

- 执行复用现有 SnapshotManager 连接池，避免与调试器连接冲突（借连、勿长期独占无清理）
- 工具名建议 `recorder_` 前缀，降低与页面工具重名概率
- CSP / MAIN：本功能不向页面注入用户源码

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] `pnpm -F @opentiny/next-wxt test` 通过
- [x] Options Tab + 侧栏注册/执行 + Skill 已落地
- [x] 用户文档已更新
