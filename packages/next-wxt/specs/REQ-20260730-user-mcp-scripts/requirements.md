# Spec：用户 MCP 脚本（油猴式在线编辑）

## 元信息

- 状态：已交付
- 主责包：`packages/next-wxt`
- 关联 Issue：—

## 背景

内置 `mcp-servers/` 只能在扩展源码中按 hostname 编写并随构建注入，不利于插件推广与第三方站点适配。需要类似 Skills / 油猴的「在线编辑 + 实时运行」能力，让用户在 Options 中编写页面 WebMCP 脚本，按 `@match` 匹配注入，且与现有内置链路解耦。

## 领域术语表

- **用户 MCP 脚本**：存储在 `chrome.storage` 中的 JS 源码，运行时注入页面 MAIN world，调用 `document.modelContext.registerTool`
- **内置 mcp-servers**：`packages/next-wxt/mcp-servers/<hostname>/`，构建期打成 IIFE，由 content 经 `<script src>` 注入
- **`replacesBuiltIn`**：用户脚本标志；匹配当前 URL 且启用时，跳过该页内置域名脚本注入
- **`@match`**：油猴风格 URL 匹配模式（如 `*://*.example.com/*`）

## 目标用户 / 场景

1. 扩展用户：为任意站点在 Options 中新增/编辑页面工具，无需重新打包扩展
2. 插件推广：演示与文档引导用户自建站点工具
3. 进阶用户：用 `replacesBuiltIn` 覆盖某站内置工具行为

## 参考资料 / 上下文

- 计划：用户 MCP 脚本（油猴式在线编辑）
- Skills 在线编辑：`entrypoints/options/SkillsTab.vue`、`utils/skills-unified.ts`
- 内置注入：`entrypoints/content.ts`、`plugins/vite-plugin-mcp-servers.ts`
- 用户文档：`docs/ai-extension/next-wxt.md`

## 范围

### In Scope

- 独立模块 `user-mcp-scripts/`（types / storage / match / resolve / template）
- Options Tab：CRUD、启用开关、编辑源码、mcp-servers 目录 zip 导入导出（兼容旧 JSON）
- background `scripting.executeScript` MAIN world 注入
- content 薄钩子：请求注入 + 按 resolve 跳过内置
- 保存后对匹配 tab 重新注入并通知工具列表刷新
- 单测与用户文档更新

### Out of Scope

- 改造/废弃 `vite-plugin-mcp-servers` 与现有三站内置示例
- `useCustomMarketMcpServers`（远程 SSE 市场）
- 在线 TypeScript 编译、GM_* 等完整油猴 API
- 与 skills-storage 共用存储实现

## 用户故事与验收标准

1. 作为用户，我希望在 Options 新建脚本并填写 `@match` 与 JS 源码，以便为新站点注册 WebMCP 工具。
   - 验收：保存后访问匹配 URL，页面 `modelContext` 出现脚本中注册的工具；侧栏「浏览器内置工具」可同步到。

2. 作为用户，我希望开关 `enabled`，以便临时停用脚本而不删除。
   - 验收：`enabled: false` 的脚本不会被注入。

3. 作为用户，我希望设置 `replacesBuiltIn`，以便覆盖同页内置域名工具。
   - 验收：匹配且 `replacesBuiltIn: true` 时不注入 `mcp-servers/<hostname>/index.js`。

4. 作为用户，我希望导入/导出脚本备份，以便迁移或分享，并与源码 `mcp-servers` 目录格式统一。
   - 验收：导出 zip 解压为 `<folder>/index.ts` + `<folder>/meta.ts`；可导入同结构或内置 mcp-servers 目录 zip；旧版 JSON 仍可导入。

5. 作为开发者，模块边界清晰，不与 skills / 市场 MCP / mcpServer 代理业务耦合。
   - 验收：核心逻辑仅在 `user-mcp-scripts/`；content/background/Options 仅薄适配。

## 非功能

- CSP：用户源码必须经 background `scripting.executeScript`（MAIN）注入，不得依赖 blob/`eval` 绕过
- 幂等：默认模板含防重复注册防护
- 非法 `@match` 保存时校验失败并提示
