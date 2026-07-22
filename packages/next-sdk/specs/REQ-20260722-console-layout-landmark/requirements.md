# Spec：云控制台 ti-app-layout landmark + A11yRoleRule.name

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 关联 Issue：（口头 / 联调需求，无强制 Issue）

## 背景

华为云控制台大量页面基于 Tiny3 `ti-app-layout` / `tp-layout-*` 自定义标签布局，但无 ARIA landmark 与 `aria-label`。无障碍树剪枝后侧栏与主区扁平混在一起，AI 难以区分「侧边导航 / 主内容 / 右侧面板」。需要在 `consoleCloud` 预设中补齐 landmark，并为角色规则增加可选声明名，避免布局节点被 Static-Lift / 剪枝抹掉。

## 领域术语表

- **landmark**：ARIA 分区角色（`navigation` / `main` / `banner` / `region` / `complementary` 等）。
- **声明可访问名（declared name）**：来自 `aria-label` / `aria-labelledby`，或 role 规则的 `name` 字段（不改 DOM）。
- **Static-Lift**：序列化时把纯静态子树文案上提到父节点 name，并可省略该子节点。

## 目标用户 / 场景

- 使用 `page-agent-tool` / `webmcp-cli` 操作云控制台的 AI Agent：需要从 YAML 树直接读出侧栏 vs 主区结构。

## 参考资料 / 上下文

- `packages/next-sdk/page-tools/configs/console-cloud.ts`
- `packages/next-sdk/page-tools/a11y/{config,vnode,build}.ts`
- `docs/webmcp-sdk/page-agent-tool.md`
- 实机：`https://console.huaweicloud.com/...`（需 webmcp-cli 已登录 Profile）

## 范围

### In Scope

- `A11yRoleRule` 增加可选 `name`；`resolveA11yInfo` 可返回 `name`
- VNode 携带 `declaredName`；序列化优先用声明名
- landmark / 声明名节点禁止被 Static-Lift 吸收；中间层 generic 包装器不得吸走 landmark 名
- 空 landmark 壳（仅声明名、无有效子节点）整段省略
- `consoleCloudPageAgentToolOptions` 映射 `ti-app-layout-*` / `tp-layout-*`
- 用户文档与 page-agent Skill 同步

### Out of Scope

- 修改控制台页面 DOM / 注入真实 `aria-label`
- 改造非 consoleCloud 站点的默认 landmark 推断
- 改变 `preserveRoles` 的工具配置接线（本次靠 `declaredName` + landmark 集合）

## 用户故事与验收标准

1. 作为 AI Agent，我希望无障碍树中侧栏与主区有独立 landmark，以便理解页面分区。
   - 验收：YAML 出现并列的 `navigation "侧边导航"` 与 `main "主内容区"`，且不出现外层 `generic "右侧面板"` 包住二者。
2. 作为集成方，我希望用 role 规则声明分区名且不改 DOM。
   - 验收：`{ role, selector, name }` 命中后 `resolveA11yInfo` 返回 `name`，树中输出 `"…"` 分区名。
3. 作为维护者，我希望折叠右栏 / 空 header 不污染树。
   - 验收：空壳 complementary / 无内容 banner 不输出；含中间层 `.ti-app-layout-*-container` 的用例不把 landmark 名上提到外层 generic。

## 非功能要求

- 向后兼容：无 `name` 的既有 role 规则行为不变
- 不因 landmark 规则显著膨胀树体积（空壳省略）

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 自动化测试已实现（含中文复现场景）
- [x] `docs/webmcp-sdk/page-agent-tool.md` 与 Skill 已更新
- [x] `pnpm -F @opentiny/next-sdk test -- test/page-tools/configs/console-cloud.test.ts test/page-tools/a11y/` 通过
