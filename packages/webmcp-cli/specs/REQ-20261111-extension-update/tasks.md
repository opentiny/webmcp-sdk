# Spec：替换已解压安装的扩展（桥接协议 1.3.0） - tasks.md

## 任务列表

- [x] Task 1: 1.3 握手与 `extension/*` 分发；错误响应带 `data`
  - 产物：`src/bridge/protocol.ts`、`src/bridge/bridge-client.ts`
  - [x] 测试：`test/bridge-handshake-v13.test.ts`（AC1–AC4）
- [x] Task 2: 绑定（目录框、确认框、`pending` / `active`、`instanceId` 限定、过期清除）
  - 产物：`src/extension-update/service.ts`、`store.ts`、`dialog.ts`、`errors.ts`
  - [x] 测试：`test/extension-update-bind.test.ts`（AC5–AC8）
- [x] Task 3: 清单校验、受限下载、安全解压、新包校验、权限差异
  - 产物：`manifest.ts`、`download.ts`、`zip.ts`、`service.ts`
  - [x] 测试：`test/extension-update-prepare.test.ts`（AC9–AC13）
- [x] Task 4: `commit` / `confirm` / `rollback` / `txn_status` 与目录锁
  - 产物：`service.ts`、`lock.ts`
  - [x] 测试：`test/extension-update-txn.test.ts`（AC14–AC17）、`test/extension-update-lock.test.ts`（AC17 跨进程）
- [x] Task 5: 恢复判定与 `extension recover` 子命令
  - 产物：`service.ts`、`src/bin.ts`、`README.md`
  - [x] 测试：`test/extension-update-recover.test.ts`（AC18）

## 依赖顺序

1 与 2 可并行；3 依赖 2 的绑定；4 依赖 3 的事务；5 依赖 4 的阶段记录。

## 验收命令

```bash
pnpm --filter @opentiny/webmcp-cli test
pnpm --filter @opentiny/webmcp-cli build
```
