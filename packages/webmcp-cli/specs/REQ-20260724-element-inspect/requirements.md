# Spec：元素检视（Cursor 式）

## 元信息

- 状态：已交付
- 主责包：`packages/webmcp-cli`
- 关联 Issue：无（会话需求）
- 关联 Skill：`packages/webmcp-cli-skill`

## 背景

`webmcp-cli` 打开的页面无法像 Cursor 内置浏览器那样把选中元素直接塞进 AI 输入框。需要页面内检视选元素 → 复制可机读引用 → 用户粘贴到外部 AI → AI 调用新 WebMCP 工具取回 Cursor 同款元数据 → AI 自行改源码。

## 领域术语表

- **检视模式（inspect mode）**：进入后拦截 hover/click，用于点选页面元素的临时模式。
- **控制浮钮（control FAB）**：注入后常驻的悬浮按钮，标识页面受 `webmcp-cli` 控制，并用于切换检视模式。
- **检视引用（inspect ref）**：剪贴板中的 `webmcp-inspect:v1 tab=… el=…` 单行字符串。
- **elementId**：页面内为选中元素分配的稳定 id（如 `webmcp-el-1`），供 `inspect-element` 工具查询。

## 目标用户 / 场景

开发者用 `webmcp-cli` 打开本地/远端页面，在外部 AI 编辑器中描述「把该卡片背景改成红色」等修改意见；AI 通过引用拉取元素元数据后改项目源码。

## 参考资料 / 上下文

- `packages/webmcp-cli/src/inject/page-init.ts`
- `packages/webmcp-cli/src/browser.ts`
- `packages/webmcp-cli-skill/SKILL.md`
- Cursor 元素信息格式：`DOM Path` / `Position` / `HTML Element`

## 范围

### In Scope

- 页面常驻可拖动悬浮按钮：标识受 `webmcp-cli` 控制，点击切换检视开/关；可关闭并收成迷你入口
- `Esc` 退出检视（浮钮仍保留）；`Cmd/Ctrl+Shift+C` 作为次要快捷键保留
- Hover 预览边框 + Click 选中并立即复制检视引用（toast / 标签提示成功）
- 剪贴板写入 `webmcp-inspect:v1 tab=<TAB_ID> el=<ELEMENT_ID>`
- 新 WebMCP 工具 `inspect-element`，返回 Cursor 同款文本元数据
- CLI 注入 `window.__webmcpcli_tabid`
- Skill / 用户文档更新

### Out of Scope

- CLI `inspect on|off`、默认常开
- 多选元素
- 剪贴板直接写入完整 DOM/HTML
- `executeJavascript` 或其它工具改 live 样式
- 自动写入项目源码

## 用户故事与验收标准

1. 作为开发者，我希望用页面悬浮按钮进入检视并点选元素，以便复制引用给外部 AI，并一眼看出页面是否受控、是否在检视中。
   - 验收：注入后右下角出现「WebMCP」浮钮；点击进入检视（文案/样式变为「检视中」）；hover 有标签与边框；click 后立即复制引用并提示「已复制」；复制内容匹配协议；再点浮钮或 Esc 退出检视，浮钮仍在。
2. 作为外部 AI，我希望根据引用调用 `inspect-element`，以便获得 Cursor 同款元数据并改源码。
   - 验收：`webmcp-cli run inspect-element '{"elementId":"…"}' -t <tab>` 返回含 `DOM Path` / `Position` / `HTML Element` 的文本；无效 id 报错。
3. 作为用户，我希望普通浏览不被检视干扰。
   - 验收：未进入检视时不拦截页面事件；退出后清理选中 overlay，浮钮保留为受控标识。

## 非功能要求

- Overlay 不得污染业务 DOM 选择（带 `data-webmcp-inspect-ui`，`elementFromPoint` 跳过）
- HTML Element 截断约 2KB，避免撑爆 Agent 上下文
- 导航后 element 登记失效属预期，错误提示需引导重新检视

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] Skill / docs 已更新
