# Spec：替换已解压安装的扩展（桥接协议 1.3.0）

## 元信息

- 状态：已交付
- 主责包：`packages/webmcp-cli`
- 关联 Issue：

## 背景

Tiny Robot 扩展以 zip 分发，用户在开发者模式下「加载已解压的扩展程序」。浏览器不会自动更新这类扩展，扩展自身也不能写本机目录。在 Chromium 上，用新版本整体替换安装目录后调用 `chrome.runtime.reload()`，扩展以新版本运行，`chrome.storage` 与扩展 ID 保持不变。

扩展负责检测新版本；下载、校验、替换目录与回滚由本机 webmcp-cli 经桥接提供的 `extension/*` 方法完成。

## 领域术语表

- **绑定**：CLI 保存的一条记录，把一个扩展实例（`instanceId`）与用户亲自选择的安装目录、扩展 key、渠道和签名公钥关联起来。之后的请求只携带 `bindingId`，不能指定目录或公钥。
- **更新清单（envelope）**：`{ payload, signatures }`。`payload` 是 UTF-8 JSON 原始字节的 base64，`signatures` 是对这些字节的 ECDSA P-256 / SHA-256 签名。
- **事务**：一次安装的记录，阶段为 `prepared` → `swapping` → `swapped` → `confirmed`，回滚为 `rolling_back` → `rolled_back`，无法自动判定时为 `needs_recovery`。
- **`update-trust.json`**：扩展产物根目录的信任文件 `{ schemaVersion: 1, channel, publicKeys: string[], manifestUrl }`，`publicKeys` 为 SPKI DER 的 base64。

## 目标用户 / 场景

以已解压方式安装 Tiny Robot 扩展、并开启本地桥接的用户。扩展在 Options 页检测到新版本后，经 CLI 完成替换并重载。

## 参考资料 / 上下文

- `packages/webmcp-cli/src/bridge/bridge-client.ts`（握手与方法分发）
- `packages/webmcp-cli/src/bridge/protocol.ts`
- `packages/webmcp-cli/src/bridge/directory-picker.ts`

## 范围

### In Scope

- 桥接协议 1.3.0 的握手：HMAC 覆盖 `instanceId`，密钥与 1.2 独立派生；1.2 客户端行为不变。
- `extension/bind`、`extension/bind_accept`、`extension/bind_reject`。
- `extension/prepare`、`extension/commit`、`extension/confirm`、`extension/rollback`、`extension/txn_status`。
- 清单验签与字段校验、受限下载、安全解压、权限差异计算。
- 按安装目录加的跨进程锁；`webmcp-cli extension recover` 子命令。

### Out of Scope

- 检测新版本、比较浏览器版本与 `runtime.id`（由扩展负责）。
- 浏览器商店或企业策略安装的扩展。
- 多个浏览器 profile 加载同一安装目录的检测。

## 用户故事与验收标准

**握手**

1. 作为扩展，我希望声明 `protocolVersion >= 1.3.0` 时按新规则认证，并获得 `extension/*` 方法。
   - 验收：`BRIDGE_AUTH.hmac = HMAC-SHA256(key, challenge + ":" + instanceId)`，`key = SHA-256(token + ":" + hmacSalt + ":bridge-auth-v1.3")` 时认证通过，调用 `extension/*` 不返回 `-32601`。
2. 作为旧版扩展，我希望 1.2 的握手与已有方法不受影响。
   - 验收：声明 1.2.0 或不声明版本、按 1.2 规则签名的连接认证通过；该连接调用 `extension/*` 返回 `-32601`。
3. 作为 CLI，我希望用 1.2 密钥对新格式消息的签名被拒绝，避免把旧客户端变成签名工具。
   - 验收：声明 1.3.0、但用 `SHA-256(token + ":" + hmacSalt)` 签 `challenge:instanceId` 的连接被关闭（`4001`）。
4. 作为 CLI，我希望 `extension/*` 只对按 1.3 规则认证的扩展连接开放，不依据自报字段。
   - 验收：按 1.3 规则认证的 `cli-client` 连接调用 `extension/*` 返回 `-32601`。

**绑定**

5. 作为用户，我希望要替换的目录由我在系统目录框中亲自选择并确认。
   - 验收：`extension/bind` 忽略请求中的任何路径参数，弹出目录框；选中目录解析为真实路径，读取 `manifest.json` 与 `update-trust.json`，再弹出确认框；确认后写入 `pending` 绑定并返回 `{ bindingId, realPath, name, version, extensionKey, channel, publicKeys }`。
6. 作为 CLI，我希望拒绝不可信的目录。
   - 验收：所选目录是符号链接或 junction、是 Windows 网络路径、缺少 `manifest.json` 的 `key`、或缺少有效的 `update-trust.json` 时返回错误，不写入绑定。用户在任一对话框取消时返回 `canceled`。
7. 作为扩展，我希望核对通过后启用绑定，不通过时删除。
   - 验收：`bind_accept` 把绑定改为 `active` 并删除同一 `instanceId` 的其他绑定；`bind_reject` 删除 `pending` 绑定；`pending` 绑定不能用于安装，24 小时后自动清除。
8. 作为 CLI，我希望绑定只能被创建它的扩展实例使用。
   - 验收：当前连接的 `instanceId` 与绑定不同时，所有使用该绑定的方法返回 `binding_not_found`。

**清单与安装包**

9. 作为 CLI，我希望只安装由绑定公钥签名的、比当前更新的同渠道版本。
   - 验收：签名无效或 `keyId` 未知返回 `signature_invalid`；双签中任一有效即接受；`channel` 不同返回 `channel_mismatch`；`version` 不大于安装目录的版本返回 `version_not_newer`；`sequence` 不大于绑定记录的已见最大值返回 `sequence_rollback`；`size` 超过上限返回 `size_exceeded`。
10. 作为 CLI，我希望下载的内容与清单一致。
    - 验收：只允许 `http:` / `https:`，URL 不能带用户名或密码，重定向不超过 5 次；实际大小或 sha256 与清单不符返回 `size_exceeded` / `hash_mismatch`。
11. 作为 CLI，我希望拒绝恶意压缩包。
    - 验收：条目含 `..`、绝对路径、盘符、反斜杠、符号链接、大小写冲突或重复路径，或超过文件数 / 解压总大小上限时返回 `unzip_rejected`，并删除暂存目录。
12. 作为 CLI，我希望新包确实是同一个扩展的目标版本。
    - 验收：暂存目录 `manifest.json` 的 `key` 与绑定不同返回 `key_mismatch`；`update-trust.json` 的 `channel` 不同返回 `channel_mismatch`；`version` 与清单不同返回 `package_invalid`。

**安装事务**

13. 作为扩展，我希望在替换前拿到新增的权限，以便用户确认。
    - 验收：`prepare` 返回 `{ txnId, realPath, fromVersion, toVersion, permissionDiff, diffHash }`，`permissionDiff` 的五个字段各为新增项数组；同一清单重复调用返回同一事务。
14. 作为扩展，我希望替换只在用户确认的权限差异下执行，失败时尽量自动复原。
    - 验收：`commit` 的 `acceptedDiffHash` 不等于 `diffHash` 返回 `diff_mismatch`；成功后安装目录为新版本、旧版本位于 `<dir>.bak-<txnId>`，阶段为 `swapped`，绑定的已见 `sequence` 与公钥更新为新包的值；第二次改名失败时备份改回、阶段为 `rolled_back`；改回也失败时为 `needs_recovery`；目录被占用（`EBUSY` / `EPERM` / `EACCES`）时不重试并返回 `rename_locked`；对已 `swapped` 的事务重复调用返回同样结果。
15. 作为扩展，我希望新版本启动确认后清理旧备份。
    - 验收：`confirm` 把阶段改为 `confirmed`，删除同一绑定其他事务登记过的 `.bak-*` 与 `.failed-*` 目录，保留本次备份。
16. 作为用户，我希望能回到上一个版本。
    - 验收：`rollback` 仅在 `swapped` / `confirmed` 且备份存在时执行，新版本目录改名为 `<dir>.failed-<txnId>`，备份改回 `<dir>`，阶段为 `rolled_back`，返回 `{ restoredVersion }`；对已 `rolled_back` 的事务重复调用返回同样结果。
17. 作为 CLI，我希望同一安装目录上的写操作互斥。
    - 验收：`bind_accept`、`prepare`、`commit`、`confirm`、`rollback` 与 `extension recover` 持有同一把按目录真实路径加的跨进程锁，拿不到锁时立即返回 `busy`；`txn_status` 不加锁。

**恢复**

18. 作为用户，我希望进程在替换中途被杀后能恢复到一致状态。
    - 验收：`webmcp-cli extension recover` 按文件系统的实际状态处理 `swapping` / `rolling_back` / `needs_recovery` 的事务（规则见 design.md §恢复判定）；写方法执行前对同一绑定执行同一判定，无法自动处理时返回 `needs_recovery`。

## 非功能要求

- 绑定与事务记录位于 `~/.robot-wxt/`，文件权限 `0600`。
- 业务错误使用数字码 `-32010`，原因写在 `error.data.reason`；参数错误使用 `-32602`。
- 不新增依赖。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] README 说明 `extension recover`
