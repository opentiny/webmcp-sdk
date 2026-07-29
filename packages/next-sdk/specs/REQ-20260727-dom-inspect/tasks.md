# Spec：dom-inspect 任务

## 任务列表

- [x] Task 1: 编写 Spec（本目录）
- [x] Task 2: 移植并适配 `dom-inspect/` 源码（types / metadata / overlay / control-fab / inspect-mode / index）
  - 输入：`packages/webmcp-cli/src/inject/element-inspect/`（不含 register-tool / registry / clipboard-ref）
  - 产物：`packages/next-sdk/dom-inspect/*.ts`
- [x] Task 3: 从 `packages/next-sdk/index.ts` 导出公开 API
- [x] Task 4: 单测
  - [x] 测试：`packages/next-sdk/test/dom-inspect.test.ts`
    - `formatElementMetaText` / `truncateHtml` / `buildDomPath`
    - `enableInspectAssist` 挂载 FAB 并可 toggle

- [x] Task 5: webmcp-cli 改为 `enableInspectAssist({ brandLabel: 'WebMCP' })`，删除本地 element-inspect / inspect-element / 相关 e2e
- [x] Task 6: 更新 Skill / docs
- [x] Task 7: 剪贴板改为粘贴友好格式（键值同行、当前选中摘要、【】修改意见引导）
  - 测试：更新 `formatElementMetaText` 断言
