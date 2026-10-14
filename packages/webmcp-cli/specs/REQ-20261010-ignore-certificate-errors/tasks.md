# Spec：允许关闭网站证书验证 - tasks.md

## 任务列表

- [x] Task 1: 抽出证书开关、Chrome 启动参数与 Puppeteer 连接选项
  - 输入（依赖）：`packages/webmcp-cli/src/browser.ts` 现有 `startBrowserInBackground` / `connectPuppeteer`
  - 产物（输出）：`shouldIgnoreCertificateErrors`、`buildChromeLaunchArgs`、`buildPuppeteerConnectOptions`，并在启动与连接处使用
  - [x] 测试：`packages/webmcp-cli/test/ignore-certificate-errors.test.ts`
- [x] Task 2: CLI 全局参数与 stderr 警告
  - 输入（依赖）：Task 1 只读 `WEBMCP_IGNORE_CERTIFICATE_ERRORS`
  - 产物（输出）：`packages/webmcp-cli/src/bin.ts` 增加 `--ignore-certificate-errors`，`preAction` 写入环境变量并在打开时警告
- [x] Task 3: 更新 README 与 CDP Skill
  - 产物（输出）：`packages/webmcp-cli/README.md`、`packages/webmcp-cli-skill/cdp/SKILL.md`

## 依赖顺序

1 → 2 → 3

## 验收命令

```bash
pnpm -F @opentiny/webmcp-cli test
```

默认单测不启动带坏证书的浏览器。本地可用自签名 HTTPS 再执行 `webmcp-cli --ignore-certificate-errors tabs open <url>` 做手工确认。
