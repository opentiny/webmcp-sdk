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

- [x] Task 5: `doc-ai` 在开发态调用 `enableInspectAssist({ brandLabel: 'Inspect' })`
- [x] Task 6: 验证 `doc-ai` 生产构建成功，且不会自动启用检视浮钮
- [x] Task 7: 剪贴板改为粘贴友好格式（键值同行、当前选中摘要、`请输入修改意见：` 引导）
  - 测试：更新 `formatElementMetaText` 断言
