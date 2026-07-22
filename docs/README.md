# next-sdk 文档

本目录是 OpenTiny NEXT-SDK 相关的文档站点源码，基于 [VitePress](https://vitepress.dev/) 构建。

## 本地开发与预览

在项目根目录下，运行以下命令即可启动本地开发服务器并预览文档：

```bash
pnpm wiki
```

或者，你也可以进入 `docs` 目录执行：

```bash
pnpm dev
```

服务启动后，可以在浏览器中访问 `http://localhost:3000`（以实际控制台输出为准）查看本地预览。

## 构建生产文档

如需构建生产版本的文档，请在项目根目录下执行：

```bash
pnpm -F next-docs build
```

或者在 `docs` 目录下直接执行：

```bash
pnpm build
```
