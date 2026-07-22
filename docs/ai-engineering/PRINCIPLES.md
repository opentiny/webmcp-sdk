# AI 编程原理摘要（本仓库约束）

面向编码 Agent 与贡献者。完整论述见社区 Context Engineering / Harness 相关文章；此处只留 **可执行结论**。

## 1. 打破黑盒

不要「丢一句需求就等完美代码」，也不要「把仓库全塞进上下文」。企业级/棕地仓库里，上下文 **质量 > 数量**。

## 2. 注意力有限

- **Context Rot**：无关检索/长文会稀释注意力。
- **Lost in the Middle**：硬规则放文档 **开头与结尾**；细节下沉到包内 AGENTS / Skill / Spec。
- 一次任务只读：根 `AGENTS.md`（短）→ 相关包 `AGENTS.md` / Skill → 相关 `specs/` 或源码。

## 3. 对齐可验证目标（奖励信号）

差：`帮我修一下登录。`  
好：修复会话未保存；`pnpm test` 全绿；复现用例见 `test/...`。

## 4. 先规格再编码（非琐碎需求）

**编码 Agent 硬流程**：分流 →（Feature 则）写 Spec → 再改业务代码。详见根 `AGENTS.md` 文首「任务分流」。

Feature：`requirements.md` → `design.md` → `tasks.md`，目录在 **主责包** `packages/<pkg>/specs/`。

**必须建 Spec**（命中任一）：对外 API/类型变更、默认行为或站点预设变更、无障碍树/协议等可观察语义变更、跨模块多步需求、需要文档/迁移说明。

琐碎改动（文案、注释、单行日志、纯排版）可豁免 Spec，但须在 PR / 对用户回复中说明原因。  
**禁止**把「只改预设里几条规则」「只加一个可选字段」默认当成琐碎。

## 5. Spec ≠ 单元测试

| Spec | 测试 |
|---|---|
| 编码前的边界与任务拆解（Markdown） | 编码中/后的可执行断言 |
| `packages/<pkg>/specs/` | `packages/<pkg>/test/` |

禁止把 Spec 放进 `test/`。

## 6. 知识闭环

改架构/约定 → 同步包内 AGENTS 或 Skill。  
修 Bug → 补中文复现场景测试。  
合入靠 GitHub Actions，不靠自觉。

## 禁止事项（Agent）

- 不要在未完成「任务分流 / Spec」的情况下直接写非琐碎 Feature 业务代码
- 不要一次加载大量无关文件「以防万一」
- 不要把 VitePress 长文整篇贴进会话
- 不要把大型 Skill 目录当业务源码提交
- 不要另立与根 `AGENTS.md` 冲突的编辑器私有长规范
- 不要把已不推荐的 `WebMcpServer` / `WebMcpClient` 写进默认架构或新示例；主推 `document.modelContext` / `initializeBuiltinWebMCP` / `registerPageAgentTool`
