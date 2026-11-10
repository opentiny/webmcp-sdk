# Spec：宿主机命令与交互终端 - tasks.md

## 任务列表

- [x] Task 1: `tty: true` 时向命令交付 EOF，并保留终端 stdout
  - 产物：`packages/webmcp-cli/src/bridge/bash-executor.ts`
  - [x] 测试：`packages/webmcp-cli/test/bash-executor.test.ts`
- [x] Task 2: 流式通知不受 `maxBuffer` 限制；截断结果丢弃不完整 UTF-8
  - 产物：`packages/webmcp-cli/src/bridge/bash-executor.ts`
  - [x] 测试：`packages/webmcp-cli/test/bash-executor.test.ts`
- [x] Task 3: 超时结束命令进程组，并避免管道拖延返回
  - 产物：`packages/webmcp-cli/src/bridge/bash-executor.ts`
  - [x] 测试：`packages/webmcp-cli/test/bash-executor.test.ts`
- [x] Task 4: 执行前拒绝非法 JSON-RPC id
  - 产物：`packages/webmcp-cli/src/bridge/bridge-client.ts`
  - [x] 测试：`packages/webmcp-cli/test/bridge-client.test.ts`
- [x] Task 5: 替换扩展连接前销毁终端；按 socket 积压暂停终端读取
  - 产物：`bridge-client.ts`、`terminal-session.ts`、`pty-backend.ts`
  - [x] 测试：`terminal-session.test.ts`、`bridge-client.test.ts`
- [x] Task 6: node-pty 改为可选依赖并延迟加载；解析绝对可执行文件；安装时修复 spawn-helper 权限；关闭终端时结束忽略 SIGHUP 的作业
  - 产物：`package.json`、`scripts/ensure-pty-helper.mjs`、`pty-backend.ts`、`README.md`
  - [x] 测试：`packages/webmcp-cli/test/pty-backend.test.ts`

## 依赖顺序

1、2、3 可并行。4、5 依赖终端会话接口。6 与 5 共用 `pty-backend.ts`。

## 验收命令

```bash
pnpm --filter @opentiny/webmcp-cli test
```
