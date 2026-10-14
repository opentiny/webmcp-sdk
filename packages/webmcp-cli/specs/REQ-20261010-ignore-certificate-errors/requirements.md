# Spec：允许关闭网站证书验证

## 元信息

- 状态：已交付
- 主责包：`packages/webmcp-cli`
- 关联 Issue：

## 背景

CDP 模式用独立 profile 拉起 Chrome，再通过 `puppeteer.connect` 连接。启动参数与连接选项都没有忽略 HTTPS 证书错误的开关。打开自签名、过期或主机名不匹配的站点时，`page.goto` 会因 `net::ERR_CERT_*` 失败。

浏览器进程会驻留，后续命令只连接已有实例。因此开关必须同时作用于「新启动」和「连上已有实例」，而不能只改某一次 `tabs open` 的导航参数。

## 领域术语表

- **受控浏览器**：CDP 模式使用 `WEBMCP_WORKSPACE`（默认 `~/.webmcp_chrome_profile`）拉起的 Chrome / Edge 进程，不是用户日常浏览器。
- **忽略证书错误**：导航时不因证书无效而失败。不关闭 TLS，只跳过证书校验。

## 目标用户 / 场景

使用 `webmcp-cli` 打开内网、自签名或证书配置不完整的 HTTPS 站点的开发者与 AI Agent。

## 参考资料 / 上下文

- `packages/webmcp-cli/src/browser.ts`：`startBrowserInBackground`、`connectPuppeteer`
- `packages/webmcp-cli/src/bin.ts`：全局参数 `--workspace` 与 `preAction`
- `packages/webmcp-cli/src/commands/tabs.ts`、`packages/webmcp-cli/src/adapters/cdp-adapter.ts`：`page.goto`
- Puppeteer 22 `connect({ ignoreHTTPSErrors: true })` 会发送 `Security.setIgnoreCertificateErrors`

## 范围

### In Scope

- 全局参数 `--ignore-certificate-errors`，以及等价环境变量 `WEBMCP_IGNORE_CERTIFICATE_ERRORS=1`。
- 新启动 Chrome 时追加 `--ignore-certificate-errors`。
- 连接已有 Chrome 时设置 `ignoreHTTPSErrors: true`。
- 打开开关时向 stderr 输出警告。
- README 与 CDP Skill 说明用法与生效范围。

### Out of Scope

- WXT 模式（附着用户自己的 Chrome，不能注入启动参数）。
- 把该选择写入浏览器 profile；重启后须再次传参或设置环境变量。
- 按单次导航、单个标签页开关证书校验。
- 默认 `pnpm test` 中的真实坏证书浏览器 E2E。

## 用户故事与验收标准

1. 作为调用方，我希望默认仍然校验证书，以便不会在不知情时关闭 TLS 校验。
   - 验收：未传参数且未设置环境变量时，Chrome 启动参数不含 `--ignore-certificate-errors`，Puppeteer 连接选项的 `ignoreHTTPSErrors` 不为 `true`。
2. 作为调用方，我希望用一个显式开关打开证书无效的 HTTPS 站点。
   - 验收：`--ignore-certificate-errors` 或 `WEBMCP_IGNORE_CERTIFICATE_ERRORS=1` 时，启动参数包含 `--ignore-certificate-errors`，连接选项 `ignoreHTTPSErrors === true`，且 stderr 出现「当前受控浏览器已关闭 TLS 证书校验。」
3. 作为调用方，我希望开关覆盖 `tabs open`、页面内后续导航和 `webmcp-cli mcp`，而不只是某一个子命令。
   - 验收：参数在进程入口写入环境变量，`connectBrowser` 只读该环境变量。

## 非功能要求

- 默认行为与现在一致，仍校验证书。
- 开关作用于整个受控浏览器进程，直到该进程退出。之后不带开关的连接不会把它关回去。
- 仅接受环境变量值 `1` 为开启，避免把任意非空字符串当成打开。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] 用户文档 / README / CDP Skill 已更新
