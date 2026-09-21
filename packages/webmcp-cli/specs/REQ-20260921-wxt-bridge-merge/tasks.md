# Spec：合并 WXT 扩展桥接模式与双向通信能力 - tasks.md

## 任务列表

- [x] Task 1: 移植与封装 WebSocket 双向通信与守护进程基础设施
  - 产物：`packages/webmcp-cli/src/bridge/*`
  - [x] 测试：`packages/webmcp-cli/test/bash-executor.test.ts`、`packages/webmcp-cli/test/workspace-manager.test.ts`、`packages/webmcp-cli/test/daemon.test.ts`、`packages/webmcp-cli/test/bridge-client.test.ts`
- [x] Task 2: 建立 BrowserAdapter 适配器抽象与双实现
  - 产物：`packages/webmcp-cli/src/adapters/interface.ts`、`cdp-adapter.ts`、`wxt-adapter.ts`
  - [x] 测试：包含在 adapter 单元测试与现有 CDP 测试中
- [x] Task 3: 改造 CLI 入口 bin.ts，实现双模式预检路由与专属命令分发
  - 产物：`packages/webmcp-cli/src/bin.ts`、`commands/agent.ts`、`commands/skills.ts`
  - [x] 测试：现有 `expand-file-refs.test.ts`、`parse-run-args.test.ts` 与实机 CLI 测试
- [x] Task 4: 实现统一双模式 MCP Server
  - 产物：`packages/webmcp-cli/src/mcp/tools.ts`、`packages/webmcp-cli/src/mcp/server.ts`
- [x] Task 5: 拆分规划独立面向 Agent 的 Skill 指南
  - 产物：`packages/webmcp-cli-skill/cdp/SKILL.md`、`packages/webmcp-cli-skill/wxt/SKILL.md`、`skills.manifest.json`

## 验收命令

```bash
pnpm test
pnpm -F @opentiny/webmcp-cli test
node .github/scripts/pr-gate.mjs --title "feat(webmcp-cli): 合并 WXT 扩展桥接模式与双向通信能力" --changed-files-file <(git status -s)
```
