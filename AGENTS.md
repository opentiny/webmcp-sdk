# AGENTS.md

本文件是 OpenTiny NEXT-SDKs 对 **所有编码 Agent** 的唯一横切约束源（[AGENTS.md 开放标准](https://github.com/openai/agents.md)）。  
人类文档见 `README.md` / `CONTRIBUTING.zh-CN.md`；原理见 `docs/ai-engineering/`。

**改某个包时：先读本文 → 再读该包 `packages/<pkg>/AGENTS.md`（若有）→ 再按需打开 Skill / Spec。不要整仓灌上下文。**

## 任务分流（动手前硬门禁 — 所有 Agent 必须先做）

收到任何编码类需求后，**在写业务代码之前**先完成分流；不得跳过。拿不准时 **先问用户**，不要默认开写。

| 判定 | 条件（命中任一即成立） | 动手前必须完成 |
|---|---|---|
| **Bug** | 修复错误行为 / 回归 /「复现：」类描述 | 在主责包 `test/` 写或更新含中文 **`复现：`** 的用例，再改代码 |
| **非琐碎 Feature** | 见下方「必须建 Spec」清单 | 先建 `packages/<pkg>/specs/REQ-YYYYMMDD-slug/`（`requirements.md` + `design.md` + `tasks.md`），再按 `tasks.md` 实现 |
| **琐碎豁免** | 仅文案/注释/单行日志/纯排版，且不改行为与 API | 可免 Spec；PR / 回复中写明豁免理由 |

### 必须建 Spec（非琐碎 Feature）

命中 **任一** 即视为非琐碎，**禁止**以「只改几行 / 只是预设」为由豁免：

1. 新增或修改 **对外导出的 API / 类型**（含可选字段，如配置项、`A11yRoleRule` 新属性）
2. 改变 **运行时默认行为或站点预设**（如 `consoleCloudPageAgentToolOptions`、默认 a11y 规则）
3. 改变 **无障碍树 / 序列化 / 剪枝 / 工具协议** 等可观察语义
4. 跨模块或跨包协作，或需要多步任务拆解才能说清验收
5. 需要补用户文档 / 迁移说明才能安全使用

### 允许的琐碎豁免（须显式声明）

- 错别字、注释、与行为无关的格式化
- 单测断言文案微调（不改变断言意图）
- 已有 Spec 的 `tasks.md` 内已列出的纯执行项（Spec 已存在则直接做任务，不必新建）

### 错误示范（禁止）

- 用户说「给控制台布局加 landmark」→ 直接改 `console-cloud.ts`（漏 Spec）
- 「顺手」扩展公开类型字段却声称琐碎
- 先实现再补 Spec 且不告知用户（允许事后补建，但须在当次会话补齐并标明状态）

## 上下文工程（硬规则）

1. **质量 > 数量**：少而准；禁止一次加载大量无关文件。
2. **就近原则**：Spec → `packages/<pkg>/specs/`；测试 → `packages/<pkg>/test/`；包约定 → 包 `AGENTS.md`；薄 Skill → `packages/<pkg>/skills/`。
3. **按需 Skill**：大 Skill 经 `pnpm install` → `pnpm skills:sync` 落到 `.agents/skills/`（不进 Git）。
4. **完成定义必须可验证**：写清命令（如 `pnpm test`）与期望。

## 一页纸架构

通信流：`App ↔ document.modelContext（浏览器内置 WebMCP / polyfill）↔ page-agent-tool 等工具 ↔ Agent / WebAgent ↔ LLM`（UI：TinyRobot / @opentiny/next-remoter）。

主推：`initializeBuiltinWebMCP()` + `document.modelContext.registerTool` / `registerPageAgentTool`。不要在约束与新代码中再推广已不推荐的 `WebMcpServer` / `WebMcpClient`。

| 包 | 职责 |
|---|---|
| `@opentiny/next-sdk` | 浏览器 WebMCP（polyfill/桥接）+ page-tools + agent + remoter API |
| `@opentiny/next-remoter` | Vue3 聊天 UI |
| `@opentiny/next-wxt` | 浏览器扩展 |
| `@opentiny/webmcp-cli` | 注入 CLI |
| 示例 / docs | `doc-ai*`、playground、`docs/` VitePress |

详情：`docs/ai-engineering/steering/structure.md`。  
**注意**：`next-sdk` 源码在包根，无 `packages/next-sdk/src/`。

## 技术栈与命令

pnpm monorepo · TypeScript · Vite · Vue3 / TinyVue / TinyRobot · Vitest · MCP SDK · Zod

```bash
pnpm install          # prepare → skills:sync
pnpm skills:sync
pnpm build
pnpm test
pnpm test:browser
pnpm dev / pnpm dev:remoter / pnpm dev:wxt / pnpm wiki
```

## 行为边界

**允许**：按 Spec/Issue 改业务包、补测试与文档、跑测试与本地门禁脚本。  

**禁止**：

- 跳过上方「任务分流」直接写业务代码
- 另立与本文冲突的编辑器私有长规范为权威源
- 把大型 Agent Skill 目录当业务源码提交
- 把 Spec 放进 `test/`，或把业务 Spec 堆进 `docs/ai-engineering/`
- 无必要修改发布密钥 / 跳过 git hooks
- 跳过 Bug 复现测试或 Feature Spec（除非用户明确豁免并写明理由）

**UI**：通用组件用 TinyVue；聊天用 TinyRobot。沟通语言：**简体中文**。

## 质量门禁（Bug）

修 Bug **必须**：

1. 在主责包 `test/` 增加/更新用例，文件内容须包含中文 **`复现：`** 场景关键字
2. `pnpm test`（或包级 test）通过

可选：有 GitHub Issue 时填写 `Issue: #N`；其它途径（口头、群聊、内部单等）提供的 bug **不强制**关联 Issue，可在 PR 说明来源。

模板：`docs/ai-engineering/templates/bug-repro.md`。

## 需求与 Spec（Feature）

非琐碎 Feature（判定见文首「必须建 Spec」）：

1. 在主责包创建 `packages/<pkg>/specs/REQ-YYYYMMDD-slug/`
2. 填写 `requirements.md` / `design.md` / `tasks.md`（模板在 `docs/ai-engineering/templates/`）
3. `tasks.md` 须列出测试任务；实现落在 `test/`
4. PR 标题使用 `feat(...):`；变更中须包含该 Spec 目录（门禁自动校验）。琐碎豁免可打 label `skip-spec`

琐碎改动可豁免 Spec，须在 PR / 对用户回复中说明豁免理由（或打 `skip-spec`）。

## 合入门禁

PR 须通过 **Merge Ready**（约定式标题定类型 + 变更文件含复现测试/Spec + 测试）。  
本地：`pnpm pr-gate` 或 `node .github/scripts/pr-gate.mjs --help`。  
说明：`docs/ai-engineering/merge-gate.md`。

## 知识索引

| 资源 | 路径 |
|---|---|
| 原理 | `docs/ai-engineering/PRINCIPLES.md` |
| Steering | `docs/ai-engineering/steering/` |
| next-sdk 包指南 | `packages/next-sdk/AGENTS.md` |
| page-agent Skill | `packages/next-sdk/skills/page-agent/SKILL.md`（sync 后 `.agents/skills/next-sdk-page-agent`） |
| Skills 安装 | `docs/ai-engineering/skills-install.md` · `skills.manifest.json` |
| page-agent 用户文档 | `docs/webmcp-sdk/page-agent-tool.md` |
| 贡献指南 | `CONTRIBUTING.zh-CN.md` |

## 再次强调（完成定义）

1. **未先分流、未建 Spec 就开始写非琐碎 Feature 代码** → 视为违规，应停下来补 Spec（或取得用户豁免）。
2. 未附中文复现测试的 Bugfix、未附包内 Spec 的非琐碎 Feature、未过 `Merge Ready` 的 PR，**视为未完成，不得合入**。
