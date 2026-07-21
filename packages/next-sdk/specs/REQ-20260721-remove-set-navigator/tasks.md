# Spec：tasks — 移除 setNavigator / routeConfig

## 任务列表

- [x] Task 1: 删除 `bridge.ts`
  - 产物：整文件删除；`initializeBuiltinWebMCP` 仅注入 polyfill；Remoter/WXT 改走标准 API
  - [x] 测试：`pnpm -F @opentiny/next-sdk build` / `test`

- [x] Task 2: 三套示例导航模版
  - 产物：`doc-ai|doc-ai-react|doc-ai-angular` 的 `mcp-servers/navigate-tool.ts`（routeToolsMap + waitForRouteTools + 注册）
  - 入口去掉 `setNavigator`；`mcp-servers/index.ts` 改为调用模版

- [x] Task 3: finance 与其它页面适配
  - 产物：finance 改为页面内 `registerTool`；清理 `registerPageTool` / 全局 `routeConfig` 声明

- [x] Task 4: 文档
  - 产物：更新 `docs/best-practice/*`，给出 Vue/React/Angular 可 copy 模版

- [x] Task 5: 验证
  - [x] `pnpm -F @opentiny/next-sdk test`
  - [x] `pnpm -F @opentiny/next-sdk build`

## 依赖顺序

1 → 2 → 3 → 4 → 5

## 验收命令

```bash
pnpm -F @opentiny/next-sdk build
pnpm -F @opentiny/next-sdk test
```
