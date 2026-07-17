# Structure（仓级 Monorepo）

pnpm workspace，包主要在 `packages/`。

| 包 / 目录 | 职责 |
|---|---|
| `@opentiny/next-sdk` | 核心 SDK：浏览器 WebMCP（polyfill/桥接）、page-tools、agent、remoter、skills API |
| `@opentiny/next-remoter` | Vue3 聊天 / 远程 UI（TinyRobot） |
| `@opentiny/next-wxt` | 浏览器扩展（WXT） |
| `@opentiny/webmcp-cli` | 注入 WebMCP / page-agent 的 CLI |
| `doc-ai` / `doc-ai-react` / `doc-ai-angular` | 示例应用 |
| `next-sdk-playground` / `vue-playground` | 演示 |
| `next-docs`（`docs/` VitePress） | 用户文档站点 |

## 就近资产（按包）

```text
packages/<pkg>/
  AGENTS.md          # 可选，包约定
  specs/             # Feature Spec 实例
  test/              # 可执行测试
  skills/            # 薄项目 Agent Skill（若有）
```

## 注意

- `@opentiny/next-sdk` 源码在包根目录（如 `page-tools/`、`initializeBuiltinWebMCP`、`runtime.ts`），**没有**独立的 `src/` 一层。
- 工具注册主路径：`document.modelContext`（及 polyfill）；不存在过时文档里的 `packages/next-sdk/transport/` 独立目录。不要在结构说明中再介绍已不推荐的 Server/Client 类文件。
