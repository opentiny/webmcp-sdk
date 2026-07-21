# AGENTS.md

本文件是 OpenTiny NEXT-SDKs 对 **所有编码 Agent** 的唯一横切约束源（[AGENTS.md 开放标准](https://github.com/openai/agents.md)）。  
人类文档见 `README.md` / `CONTRIBUTING.zh-CN.md`；原理见 `docs/ai-engineering/`。

**改某个包时：先读本文 → 再读该包 `packages/<pkg>/AGENTS.md`（若有）→ 再按需打开 Skill / Spec。不要整仓灌上下文。**

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

- 另立与本文冲突的编辑器私有长规范为权威源
- 把大型 Agent Skill 目录当业务源码提交
- 把 Spec 放进 `test/`，或把业务 Spec 堆进 `docs/ai-engineering/`
- 无必要修改发布密钥 / 跳过 git hooks
- 跳过 Bug 复现测试或 Feature Spec（除非填写豁免字段）

**UI**：通用组件用 TinyVue；聊天用 TinyRobot。沟通语言：**简体中文**。

## 质量门禁（Bug）

修 Bug **必须**：

1. 在主责包 `test/` 增加/更新用例，文件内容须包含中文 **`复现：`** 场景关键字
2. `pnpm test`（或包级 test）通过

可选：有 GitHub Issue 时填写 `Issue: #N`；其它途径（口头、群聊、内部单等）提供的 bug **不强制**关联 Issue，可在 PR 说明来源。

模板：`docs/ai-engineering/templates/bug-repro.md`。

## 需求与 Spec（Feature）

非琐碎 Feature：

1. 在主责包创建 `packages/<pkg>/specs/REQ-YYYYMMDD-slug/`
2. 填写 `requirements.md` / `design.md` / `tasks.md`（模板在 `docs/ai-engineering/templates/`）
3. `tasks.md` 须列出测试任务；实现落在 `test/`
4. PR Gate Fields 填写 `Spec: packages/<pkg>/specs/REQ-.../`

琐碎改动可豁免 Spec，须在 PR 说明。

## 合入门禁

PR 须通过 **Merge Ready**（标题约定 + Checklist + Gate Fields + 测试）。  
本地：`pnpm pr-gate` 或 `node .github/scripts/pr-gate.mjs`。  
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

未附中文复现测试的 Bugfix、未附包内 Spec 的非琐碎 Feature、未过 `Merge Ready` 的 PR，**视为未完成，不得合入**。
