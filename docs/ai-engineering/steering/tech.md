# Tech（仓级技术栈与命令）

## 技术栈

- 包管理：pnpm workspace（`packageManager`: pnpm@9.x）
- 语言：TypeScript（strict）
- 构建：Vite
- UI：Vue 3 + TinyVue / TinyRobot；部分示例为 React / Angular / Next.js
- 协议：`@modelcontextprotocol/sdk`、Zod、Ajv
- 测试：Vitest（`packages/next-sdk`、`packages/webmcp-cli`）；浏览器 E2E 见 `pnpm test:browser`

## 常用命令

```bash
pnpm install
pnpm skills:sync          # 同步 Agent Skills 到 .agents/skills
pnpm build                # 构建 @opentiny/next-sdk
pnpm test                 # next-sdk + webmcp-cli 单测
pnpm test:browser         # webmcp-cli 浏览器 E2E
pnpm dev                  # doc-ai
pnpm dev:remoter
pnpm dev:wxt
pnpm wiki                 # VitePress 文档
```

## Node

- Node.js >= 16
- pnpm >= 8
