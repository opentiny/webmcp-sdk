# Spec：dev 入口拆分（本地开发能力）

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 协作包：`packages/doc-ai`（示例消费方）
- 关联 Issue：

## 背景

`dom-inspect`（Inspect Assist）等能力仅用于本地开发辅助，不应随主包 `@opentiny/next-sdk` 默认入口打入生产消费路径。需要新增独立入口 `dev.ts`，将开发态工具从 `index.ts` 拆出，减小主包心智负担与潜在体积耦合。

## 领域术语表

- **dev 入口**：`@opentiny/next-sdk/dev`，专放本地开发相关导出（如 `dom-inspect`）
- **主入口**：`@opentiny/next-sdk`（`index.ts`），面向生产与通用 SDK 能力

## 目标用户 / 场景

本地开发者在 playground / 文档站等工程中按需 `import { enableInspectAssist } from '@opentiny/next-sdk/dev'`。

## 参考资料 / 上下文

- `packages/next-sdk/index.ts` / `core.ts` / `vite.config.ts` / `package.json`
- `packages/next-sdk/dom-inspect/`
- `packages/next-sdk/specs/REQ-20260727-dom-inspect/`
- `packages/doc-ai/src/main.ts`

## 范围

### In Scope

- 新增 `dev.ts` 入口，导出 `dom-inspect` 相关 API
- Vite lib 多入口增加 `dev`
- `package.json` / `publishConfig.exports` 增加 `./dev`
- 从 `index.ts` 移除 `dom-inspect` 导出
- 更新 `doc-ai` 等仓内消费方导入路径
- 更新包 `AGENTS.md` 入口差异说明
- 自动化测试锁定入口契约

### Out of Scope

- 改动 `dom-inspect` 运行时行为
- 将 `dev` 入口做成 CDN/IIFE runtime 包

## 用户故事与验收标准

1. 作为 SDK 维护者，我希望主入口不再导出 Inspect Assist，以便生产消费者不会误用开发工具。
   - 验收：`index.ts` 无 `dom-inspect` / `enableInspectAssist` 导出；测试断言主入口不包含这些符号。
2. 作为本地开发者，我希望通过 `@opentiny/next-sdk/dev` 使用 `enableInspectAssist` 等 API。
   - 验收：`dev.ts` 导出与原先主入口一致的 Inspect Assist 符号；`doc-ai` 开发态导入路径已切换。
3. 作为发布流水线，我希望构建产物包含 `dist/dev.js` 与类型声明，且 exports 可解析。
   - 验收：Vite 多入口含 `dev`；`package.json` exports 含 `./dev`。

## 非功能要求

- 破坏性变更：从 `@opentiny/next-sdk` 直接导入 Inspect Assist 将失败，需改为 `/dev` 子路径
- 不改变 `dom-inspect` 功能语义

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] 包 `AGENTS.md` 入口差异已更新
- [x] `doc-ai` 导入路径已更新
