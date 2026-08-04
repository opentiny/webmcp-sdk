# Spec：tasks.md — Recorder WebMCP

## 任务列表

- [x] Task 1: 创建本 Spec（requirements / design / tasks）
  - 产物：`packages/next-wxt/specs/REQ-20260731-recorder-webmcp/*`

- [x] Task 2: 实现 `recorder-webmcp` 核心模块
  - 产物：`recorder-webmcp/{types,storage,resolve,template,params,runtime,index}.ts`
  - [x] 测试：`test/recorder-webmcp/storage.test.ts`
  - [x] 测试：`test/recorder-webmcp/resolve.test.ts`
  - [x] 测试：`test/recorder-webmcp/params.test.ts`

- [x] Task 3: Sidepanel 注册 + puppeteer 执行 + 落盘工具
  - 产物：`entrypoints/sidepanel/recorderWebmcpTools.ts`、改 `mcpServer.ts`
  - 行为：激活页 match 同步；`recorder_webmcp_save` 常驻；执行走 `getSnapshotManager`

- [x] Task 4: Options `RecorderWebmcpTab`
  - 产物：`entrypoints/options/RecorderWebmcpTab.vue`、改 `Options.vue`
  - 能力：列表 / 启用 / CRUD / steps+schema JSON 编辑 / JSON 导入导出

- [x] Task 5: Skill + 用户文档
  - 产物：`skills/recorder-to-webmcp/SKILL.md`、更新 `docs/ai-extension/next-wxt.md`

- [x] Task 6: 验收
  - 命令：`pnpm -F @opentiny/next-wxt test`（37 passed）

## 依赖顺序

1 → 2 → 3 → 4 → 5 → 6

## 验收命令

```bash
pnpm -F @opentiny/next-wxt test
```

## 手测清单

1. Options →「Recorder 自动化」→ 新建示例工具，`@match` 填 `*://opentiny.design/*`，保存
2. 打开 opentiny.design，侧栏「浏览器内置工具」出现该工具
3. 切换到不匹配站点，工具消失
4. 对话中粘贴 Recorder 脚本，Agent 按 Skill 调用 `recorder_webmcp_save` 落盘
5. 调用生成的工具，页面发生对应点击/导航（需 debugger 授权）
