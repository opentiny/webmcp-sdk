# Spec：tasks — 移除 setNavigator / routeConfig

## 任务列表

- [x] Task 1: 删除 `bridge.ts`
  - 产物：整文件删除；`initializeBuiltinWebMCP` 仅注入 polyfill；Remoter/WXT 改走标准 API
  - [x] 测试：`pnpm -F @opentiny/next-sdk build` / `test`

- [x] Task 2: 三套示例导航模版
  - 产物：`doc-ai|doc-ai-react|doc-ai-angular` 的 `mcp-servers/navigate-tool.ts`（routeToolsMap + 自注册 + SDK waitForRouteTools）
  - 入口去掉 `setNavigator`；`mcp-servers/index.ts` 改为调用模版

- [x] Task 3: finance 与其它页面适配
  - 产物：finance 改为页面内 `registerTool`；清理 `registerPageTool` / 全局 `routeConfig` 声明

- [x] Task 4: 文档
  - 产物：更新 `docs/best-practice/*`，给出 Vue/React/Angular 可 copy 模版

- [x] Task 5: 验证
  - [x] `pnpm -F @opentiny/next-sdk test`
  - [x] `pnpm -F @opentiny/next-sdk build`

- [x] Task 6: 仅导出握手 helper
  - 产物：`page-tools/wait-for-route-tools.ts` 导出 `waitForRouteTools(path, routeToolsMap, options?)`
  - 示例自行注册 `navigate_to_page`，跳转后调用 SDK helper
  - [x] 测试：`packages/next-sdk/test/page-tools/wait-for-route-tools.test.ts`

## 依赖顺序

1 → 2 → 3 → 4 → 5 → 6

## 验收命令

```bash
pnpm -F @opentiny/next-sdk build
pnpm -F @opentiny/next-sdk test
```
