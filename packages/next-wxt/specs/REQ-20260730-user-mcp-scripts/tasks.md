# Spec：tasks.md — 用户 MCP 脚本

## 任务列表

- [x] Task 1: 创建本 Spec（requirements / design / tasks）
  - 产物：`packages/next-wxt/specs/REQ-20260730-user-mcp-scripts/*`

- [x] Task 2: 实现 `user-mcp-scripts` 核心模块
  - 产物：`packages/next-wxt/user-mcp-scripts/{types,match,resolve,storage,template,index}.ts`
  - [x] 测试：`packages/next-wxt/test/user-mcp-scripts/match.test.ts`
  - [x] 测试：`packages/next-wxt/test/user-mcp-scripts/resolve.test.ts`
  - [x] 测试：`packages/next-wxt/test/user-mcp-scripts/storage.test.ts`
  - [x] 测试基建：`vitest.config.ts` + `package.json` `test` script

- [x] Task 3: background 注入 + content 薄钩子
  - 产物：`entrypoints/background/inject-user-mcp-scripts.ts`、改 `background.ts`、`content.ts`
  - 行为：MAIN world 执行 source；`replacesBuiltIn` 跳过内置；保存后 reinject

- [x] Task 4: Options `UserMcpScriptsTab`
  - 产物：`entrypoints/options/UserMcpScriptsTab.vue`、改 `Options.vue`
  - 能力：列表 / 启用 / CRUD / mcp-servers zip 导入导出 / 保存 reinject

- [x] Task 5: 用户文档与验收
  - 产物：更新 `docs/ai-extension/next-wxt.md`
  - 验收命令见下

- [x] Task 7: 执行桥改用 capability token（修复可伪造 OWNER）
  - 产物：`public/vendor/user-mcp-exec.js`、`exec-bridge.ts`、`inject-user-mcp-scripts.ts`、content/wxt 顺序注释
  - [x] 测试：`csp-bridge-repro.test.ts`（bind→exec、拒绝无 token 伪造桥）


## 依赖顺序

1 → 2 → 3 → 4 → 5

## 验收命令

```bash
pnpm -F @opentiny/next-wxt test
```

## 手测清单

1. Options →「页面 MCP 脚本」→ 新建，`@match` 填 `*://example.com/*`，保存示例工具
2. 打开 example.com，侧栏「浏览器内置工具」出现新工具
3. 关闭 enabled，刷新页面，工具消失
4. 对内置站（如 `www.baidu.com`）建脚本并勾选 `replacesBuiltIn`，确认内置 `baidu-search` 不再注入、用户工具存在
5. zip 导出再导入（或导入内置 mcp-servers 目录打包），列表一致且默认禁用
