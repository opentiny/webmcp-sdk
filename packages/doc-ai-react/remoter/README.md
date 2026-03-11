# doc-ai-react-remoter

doc-ai-react 的 **Remoter 子包**：独立 Vite 工程，仅负责 iframe 内的 Vue TinyRemoter 应用。

## 与主应用的关系

- **react 主应用**（`packages/doc-ai-react`）：用 `ng serve` 独立启动，不负责 remoter 的构建或代理逻辑。
- **本包**：用 `pnpm dev` 独立启动 Vite，默认端口 5179。主应用通过 proxy 将 `/remoter.html`、`/src` 等请求转发到本服务。

## 常用命令

- `pnpm dev`：启动 Vite 开发服务（端口 5179）
- `pnpm build`：构建产物到 `dist/`
- `pnpm preview`：预览构建结果

## 开发流程

在 doc-ai-react 根目录：

- 只起 react：`pnpm dev:react`
- 只起 Remoter：`pnpm dev:remoter`
- 同时起两个：`pnpm dev`（concurrently 会同时跑 ng serve 与 remoter 的 vite）
