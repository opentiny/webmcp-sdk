# Architecture（仓级硬约束，极瘦）

只写 **跨包** 约束。包内模块与 API 细节见各包 `AGENTS.md` / Skill。

## 通信流（概念）

```text
Frontend App
  ↔ document.modelContext（浏览器 WebMCP / initializeBuiltinWebMCP polyfill）
  ↔ document.modelContext.registerTool / registerPageAgentTool
  ↔ Agent / WebAgent ↔ LLM
  ↓
TinyRobot / @opentiny/next-remoter
```

约束与新实现以浏览器内置 WebMCP 为准；不要再把已不推荐的 `WebMcpServer` / `WebMcpClient` 写进 Agent 指引或默认架构说明。

## 跨包依赖方向

- 示例应用、扩展、CLI **依赖** `@opentiny/next-sdk`，不要反向把示例特有逻辑塞进 SDK 公共 API，除非有明确 Spec。
- 发布与构建脚本以各包 `package.json` 为准；不要在无 Spec 的情况下改动发布密钥或 CI 密钥相关配置。

## 知识供给

- 权威约束：根 `AGENTS.md` + 包级 `AGENTS.md`
- 大体积编码 Skill：npm + `pnpm skills:sync`，不进 Git
- Feature Spec：`packages/<pkg>/specs/`；测试：`packages/<pkg>/test/`

## 禁止

- 以 `.cursor/rules`、`.cursorrules`、`.kiro/*` 等作为仓库权威约束源
- 在 `docs/ai-engineering/` 堆积业务 Spec 实例
- 将 Spec Markdown 放入 `test/`
