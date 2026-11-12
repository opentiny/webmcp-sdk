# Spec：替换已解压安装的扩展（桥接协议 1.3.0） - design.md

## 方案概述

`ExtensionBridgeClient` 下发的 `BRIDGE_CHALLENGE.protocolVersion` 升为 `1.3.0`。客户端在 `BRIDGE_AUTH.protocolVersion` 声明不低于 1.3.0 时按 1.3 规则验证 HMAC，并记录握手里的 `instanceId`；声明更低版本或不声明时按 1.2 规则验证。只有按 1.3 规则认证、且成为当前扩展连接的 socket，其 `extension/*` 请求才交给 `ExtensionUpdateService`，其余连接的 `extension/*` 返回 `-32601`，不转发给扩展。

`ExtensionUpdateService` 是 `extension/*` 的唯一实现，每个方法接收当前连接的 `instanceId`。它依赖可注入的目录框、确认框、`fetch` 与改名函数，测试用临时目录替换 `~/.robot-wxt/`。

替换安装目录只用两次同级改名：`<dir>` → `<dir>.bak-<txnId>`，`<dir>.staging-<txnId>` → `<dir>`。每次改名前后先写事务记录，进程中断后由恢复判定根据三个路径的实际状态收尾。

## 涉及模块 / 文件

- `src/bridge/protocol.ts`：版本号、方法名、`-32010`
- `src/bridge/bridge-client.ts`：1.3 握手、`extension/*` 分发、错误带 `data`
- `src/extension-update/service.ts`：`extension/*` 方法与恢复
- `src/extension-update/store.ts`：绑定与事务记录的读写
- `src/extension-update/manifest.ts`：清单验签、payload 校验、版本比较
- `src/extension-update/download.ts`：受限下载
- `src/extension-update/zip.ts`：安全解压
- `src/extension-update/lock.ts`：按目录的跨进程锁
- `src/extension-update/dialog.ts`：系统确认框
- `src/extension-update/errors.ts`：业务错误
- `src/bin.ts`：`extension recover` 子命令
- `test/extension-update-*.test.ts`、`test/bridge-handshake-v13.test.ts`

## 核心数据结构 / 类型定义

```typescript
interface BindingRecord {
  bindingId: string
  instanceId: string
  realPath: string
  extensionKey: string
  channel: string
  publicKeys: string[]
  state: 'pending' | 'active'
  highestSequence: number // 初始 0
  createdAt: string
}

type TxnPhase = 'prepared' | 'swapping' | 'swapped' | 'confirmed' | 'rolling_back' | 'rolled_back' | 'needs_recovery'

interface TxnRecord {
  txnId: string
  bindingId: string
  realPath: string
  fromVersion: string
  toVersion: string
  sequence: number
  payloadHash: string // sha256(envelope.payload)，识别重复的 prepare
  previousPublicKeys: string[]
  nextPublicKeys: string[]
  permissionDiff: PermissionDiff
  diffHash: string
  stagingDir: string
  backupDir: string
  failedDir: string
  phase: TxnPhase
  createdAt: string
  updatedAt: string
}

interface PermissionDiff {
  permissions: string[]
  host_permissions: string[]
  optional_permissions: string[]
  optional_host_permissions: string[]
  content_script_matches: string[] // 取自 content_scripts[].matches
}
```

存储：绑定 `~/.robot-wxt/extension-bindings.json`（`{ schemaVersion: 1, bindings }`），事务 `~/.robot-wxt/update-txn/<txnId>.json`，锁 `~/.robot-wxt/locks/<sha256(realPath)>`。写入先写临时文件再改名，权限 `0600`。

## 握手

| 客户端声明 | HMAC 密钥 | 签名消息 | `extension/*` |
|---|---|---|---|
| `>= 1.3.0` | `SHA-256(token + ":" + hmacSalt + ":bridge-auth-v1.3")` | `challenge + ":" + instanceId` | 扩展连接开放 |
| `< 1.3.0` 或未声明 | `SHA-256(token + ":" + hmacSalt)` | `challenge` | 不开放 |

声明 1.3 时 `instanceId` 必须是非空字符串。两种规则使用不同的密钥，因此 1.2 客户端对任意 challenge 的签名都不能当作 1.3 的签名使用。

## 方法

| 方法 | 参数 → 返回 | 加锁 |
|---|---|---|
| `extension/bind` | `{}` → `{ bindingId, realPath, name, version, extensionKey, channel, publicKeys }` | 否（等待用户操作） |
| `extension/bind_accept` | `{ bindingId }` → `{}` | 是 |
| `extension/bind_reject` | `{ bindingId }` → `{}` | 否 |
| `extension/prepare` | `{ bindingId, envelope }` → `{ txnId, realPath, fromVersion, toVersion, permissionDiff, diffHash }` | 是 |
| `extension/commit` | `{ txnId, acceptedDiffHash }` → `{ backupDir }` | 是 |
| `extension/confirm` | `{ txnId }` → `{}` | 是 |
| `extension/rollback` | `{ txnId }` → `{ restoredVersion }` | 是 |
| `extension/txn_status` | `{ txnId }` → `{ phase, paths }` | 否 |

`txn_status` 的 `paths` 为 `{ dir, backup, staging, failed }`，每项 `{ path, exists, version? }`。

`prepare` 的步骤：验签 → payload 字段 → `channel` → `version` 大于安装目录版本 → `sequence` 大于已见最大值 → `size` 上限 → 下载并校验大小与 sha256 → 解压到 `<dir>.staging-<txnId>` → 校验暂存目录的 `key`、`channel`、`version` → 计算权限差异。新的 `prepare` 会丢弃同一绑定上未提交的旧事务及其暂存目录。

`diffHash` 为按上表字段顺序序列化的 `permissionDiff` 的 sha256。

## 恢复判定

适用于阶段为 `swapping`、`rolling_back`、`needs_recovery` 的事务。`version` 指该目录下 `manifest.json` 的版本。

| `<dir>` | `.bak-<txnId>` | `.failed-<txnId>` | 处理 |
|---|---|---|---|
| 存在，`fromVersion` | 不存在 | 任意 | 替换未开始或回滚已完成：删除暂存目录，记 `rolled_back`，绑定公钥恢复为替换前的值 |
| 不存在 | 存在 | 任意 | 改名中断：备份改回，删除暂存目录，记 `rolled_back`，绑定公钥恢复为替换前的值 |
| 存在，`toVersion` | 存在 | 不存在 | 替换已完成：记 `swapped`，更新绑定的已见 `sequence` 与公钥，提示在浏览器中重新加载扩展 |
| 其他 | — | — | 记 `needs_recovery`，列出各路径状态与版本 |

## 错误码

JSON-RPC 错误码：`-32601` 方法不存在或连接未按 1.3 认证；`-32602` 参数错误（`data.reason = "invalid_params"`）；`-32010` 业务错误，`data.reason` 取值如下。

| `data.reason` | 含义 |
|---|---|
| `busy` | 拿不到目录锁 |
| `needs_recovery` | 同一绑定有无法自动处理的事务 |
| `binding_not_found` | 绑定不存在、未启用、已过期或属于其他 `instanceId` |
| `txn_not_found` | 事务不存在或不属于当前绑定 |
| `canceled` | 用户取消了目录框或确认框 |
| `directory_rejected` | 所选目录是符号链接、网络路径，或缺少 `manifest.json` 的 `key` / 有效的 `update-trust.json` |
| `manifest_invalid` | 清单结构或 payload 字段不合法 |
| `signature_invalid`、`channel_mismatch`、`key_mismatch`、`version_not_newer`、`sequence_rollback` | 清单或新包的对应校验失败 |
| `download_failed` | 下载地址不合法、重定向过多或响应非 2xx |
| `size_exceeded`、`hash_mismatch` | 安装包大小或哈希不符 |
| `unzip_rejected` | 压缩包含不安全的条目或超过上限 |
| `package_invalid` | 新包缺少 `manifest.json`，或版本与清单不同 |
| `diff_mismatch` | `acceptedDiffHash` 与事务不符 |
| `phase_invalid` | 事务阶段不允许该操作 |
| `directory_changed` | 安装目录的版本已不是 `fromVersion` |
| `rename_locked` | 目录被占用，改名失败 |
| `rename_failed` | 其他原因的改名失败 |

## 上限

| 项 | 值 |
|---|---|
| 安装包大小 | 256 MiB |
| 解压后总大小 | 1 GiB |
| 压缩包条目数 | 20000 |
| 重定向次数 | 5 |
| 下载超时 | 4 分钟 |
| `pending` 绑定有效期 | 24 小时 |

## 依赖变更

无。解压基于 `node:zlib` 的 `inflateRawSync` 自行解析 zip 中央目录，以便检查重复路径与符号链接条目；只支持存储（0）与 deflate（8），拒绝加密条目与 zip64。

## API / 行为变更

| 符号或行为 | 变更类型 | 说明 |
|---|---|---|
| `PROTOCOL_VERSION` | 修改 | `1.2.0` → `1.3.0` |
| `BRIDGE_AUTH` 未声明 `protocolVersion` | 修改 | 按 1.2 规则验证（此前按服务端当前版本，即 1.2，行为不变） |
| `BRIDGE_METHODS.EXTENSION_*` | 新增 | 8 个方法名 |
| `BRIDGE_ERROR_CODE.EXTENSION_UPDATE_FAILED` | 新增 | `-32010` |
| JSON-RPC 错误响应 | 修改 | 可带 `data` |
| `webmcp-cli extension recover` | 新增 | CDP 与 wxt 模式均可执行 |

## 风险与兼容

- 已有的 1.2 扩展与 CLI 客户端不受影响：它们按 1.2 规则签名并在 `BRIDGE_AUTH` 里声明 1.2 或不声明版本。
- 目录框与确认框依赖 `osascript`（macOS）、PowerShell（Windows）、`zenity`（Linux）。
- Windows 上浏览器可能占用安装目录内的文件，改名失败时返回 `rename_locked`，由用户关闭浏览器后重试。
- 回滚只恢复代码目录，不回滚扩展数据。
