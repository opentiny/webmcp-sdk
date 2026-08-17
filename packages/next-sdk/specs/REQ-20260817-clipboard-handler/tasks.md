# Tasks：Page Agent 剪切板读写

## 任务列表

- [x] Task 1: schema 增加 `clipboard` action 与 `text` 语义描述
  - 产物：`packages/next-sdk/page-tools/schema.ts`
- [x] Task 2: 实现 `handleClipboard` 并接入 `page-agent-tool`
  - 产物：
    - `packages/next-sdk/page-tools/handlers/clipboard.ts`
    - `packages/next-sdk/page-tools/page-agent-tool.ts` → `case 'clipboard'`
- [x] Task 3: 自动化测试
  - 产物：`packages/next-sdk/test/page-tools/clipboard.test.ts`、`page-agent-tool-dispatch.test.ts` 补充 clipboard 分发与无 mask
  - 场景（须含中文 **`复现：`**）：
    - mock `navigator.clipboard.writeText` → 传入 `text` 时写入并返回成功文案
    - mock `readText` → 无 `text` 时返回「剪切板内容为: …」
    - mock reject → 返回「操作剪切板失败: …」且不抛异常
- [x] Task 4: 用户文档 / Skill
  - 产物：`docs/webmcp-sdk/page-agent-tool.md`、`skills/page-agent/SKILL.md` 补充 `clipboard` action 说明与示例

## 依赖顺序

1 → 2 →（3、4 可并行）

## 验收命令

```bash
pnpm -F @opentiny/next-sdk test
pnpm -F @opentiny/next-sdk build
```
