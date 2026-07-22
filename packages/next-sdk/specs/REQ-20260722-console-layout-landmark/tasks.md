# Spec：tasks — console layout landmark + A11yRoleRule.name

## 任务列表

- [x] Task 1: 扩展 `A11yRoleRule.name` / `A11yInfo.name` 并接入 AccName 路径
  - 产物：`page-tools/a11y/config.ts`、`types.ts`、`vnode.ts`（declaredName）
  - [x] 测试：`test/page-tools/a11y/config.test.ts`（role 规则 name）

- [x] Task 2: landmark / 声明名防 Static-Lift + 空壳省略 + 中间层包装器不吸名
  - 产物：`page-tools/a11y/vnode.ts`
  - [x] 测试：`test/page-tools/configs/console-cloud.test.ts`（含 `.ti-app-layout-right-container` 复现）

- [x] Task 3: `consoleCloud` 布局映射
  - 产物：`page-tools/configs/console-cloud.ts`
  - [x] 测试：同上（navigation / main / region / complementary / banner）

- [x] Task 4: 用户文档与 Skill
  - 产物：`docs/webmcp-sdk/page-agent-tool.md`、`skills/page-agent/SKILL.md`

- [x] Task 5: 实机验证（webmcp-cli 登录 Profile）
  - 验收：ECS 总览树为并列 `navigation "侧边导航"` / `main "主内容区"`，无外层 `generic "右侧面板"`

## 依赖顺序

1 → 2 → 3 → 4 → 5

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test -- test/page-tools/configs/console-cloud.test.ts test/page-tools/a11y/config.test.ts test/page-tools/a11y/build.test.ts
```
