# Tasks：强制 JS Polyfill 覆盖 Chromium 实验性 modelContext

## 任务列表

- [x] Task 1: `initializeBuiltinWebMCP` 支持 `forcePolyfill`（默认 true）
  - 产物：`packages/next-sdk/page-tools/initialize-builtin-WebMCP.ts`
  - 产物：`packages/next-sdk/index.ts`、`core.ts` 继续导出函数（选项不单独成类型导出）
- [x] Task 2: webmcp-cli 注入走 SDK 初始化
  - 产物：`packages/webmcp-cli/src/inject/page-init.ts` 去掉直调 `initializeWebMCPPolyfill`
- [x] Task 3: 自动化测试
  - 产物：`packages/next-sdk/test/page-tools/initialize-builtin-WebMCP.test.ts`
  - 场景（须含中文 **`复现：`**）：
    - document 上伪 native → 默认初始化后为 polyfill，且未调用原生 `getTools`
    - `{ forcePolyfill: false }` 保留伪 native
    - 已是 polyfill 时再次初始化仍保留 marker
- [x] Task 4: 用户文档 / Skill / Spec 索引
  - 产物：`docs/webmcp-sdk/global-tools.md`、`docs/guide/quick-start.md`（一句说明）、`packages/next-sdk/skills/page-agent/SKILL.md`、`packages/next-sdk/specs/README.md`
- [x] Task 5: 升级 `@mcp-b/webmcp-polyfill` / `@mcp-b/webmcp-types` 到 5.1.0，并适配原型 getter
  - 产物：`pnpm-workspace.yaml`、`initialize-builtin-WebMCP.ts`（删除可配置原型 native）、测试补原型 native 场景
  - [x] 测试：`packages/next-sdk/test/page-tools/initialize-builtin-WebMCP.test.ts`

## 依赖顺序

1 →（2、3、4 可并行）→ 5

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
```
