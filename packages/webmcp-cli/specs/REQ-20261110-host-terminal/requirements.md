# Spec：宿主机命令与交互终端

## 元信息

- 状态：已交付
- 主责包：`packages/webmcp-cli`
- 关联 Issue：

## 背景

扩展通过本地桥接调用宿主机：一次性命令走 `system/bash`，交互会话走 `terminal/*`。命令执行改为 execa；交互终端改为 node-pty。桥接在扩展重连、输出过快、超时和原生模块缺失时必须保持可用。

## 领域术语表

- **system/bash**：执行一条命令并返回 stdout、stderr、退出码。可选 `tty: true`，让程序看到终端并及时刷出输出。
- **terminal/open**：打开一个交互式伪终端，之后用 input、resize、close 操作。输出与退出通过通知推回当前扩展连接。
- **node-pty**：交互终端的原生依赖。缺失时不应阻止桥接启动。

## 目标用户 / 场景

通过 Tiny Robot 扩展在已登录浏览器旁执行宿主机命令，或打开交互式终端的开发者与 AI Agent。

## 参考资料 / 上下文

- `packages/webmcp-cli/src/bridge/bash-executor.ts`
- `packages/webmcp-cli/src/bridge/pty-backend.ts`
- `packages/webmcp-cli/src/bridge/terminal-session.ts`
- `packages/webmcp-cli/src/bridge/bridge-client.ts`
- `packages/webmcp-cli/src/bridge/protocol.ts`

## 范围

### In Scope

- `system/bash` 的超时、输出截断、流式通知，以及非 Windows 上的 `tty` 模式。
- `terminal/open`、`terminal/input`、`terminal/resize`、`terminal/close`，以及 `notification/terminal_output`、`notification/terminal_exit`。
- 扩展连接被替换时结束旧终端。
- 终端输出积压时暂停读取。
- `node-pty` 作为可选依赖，仅在打开终端时加载。
- 安装时把 `spawn-helper` 设为可执行；运行时若无权限修改，在启动失败信息中说明。

### Out of Scope

- 多个同时存在的终端会话。
- Windows 上的 `tty: true`。
- 改变 JSON-RPC 方法名或协议主版本号。

## 用户故事与验收标准

1. 作为调用方，我希望 `tty: true` 时程序仍把 stdout 当作终端，但没有提供标准输入的命令能读到 EOF 并结束。
   - 验收：非 Windows 上 `tty: true` 执行 `cat`，在超时前以退出码 0 结束。
2. 作为调用方，我希望捕获上限只限制最终结果，流式通知仍能看到之后的输出。
   - 验收：输出超过 `maxBuffer` 时结果带 `truncated`，且 `onOutput` 仍收到超限后的文本。
3. 作为调用方，我希望截断不会把半个 UTF-8 字符变成更长的替换字符。
   - 验收：`maxBuffer` 落在多字节字符中间时，最终 stdout 的字节数不超过上限，且不含 `U+FFFD`。
4. 作为调用方，我希望命令超时后，shell 拉起的后台进程也被结束，调用不会一直等它们的管道。
   - 验收：`sleep 60 & wait` 在超时后数秒内返回，且该 sleep 进程已退出。
5. 作为桥接，我希望非法请求 id 不会在序列化通知时拖垮进程。
   - 验收：id 为数组或对象时不执行命令，响应 id 为 `null`，错误码为 `-32602`。
6. 作为扩展，我希望新连接替换旧连接时，旧终端不再往新连接写输出。
   - 验收：替换连接前调用终端会话的 `disposeAll`，且此时当前 socket 仍是旧连接。
7. 作为桥接，我希望终端输出快于扩展消费时暂停读取。
   - 验收：socket `bufferedAmount` 超过 1MiB 时暂停 PTY，降到 512KiB 及以下时恢复。
8. 作为调用方，我希望没有 node-pty 时桥接仍能加载，打开终端时得到明确错误。
   - 验收：`node-pty` 为 optionalDependency，且只在 `spawnHostPty` 里加载。
9. 作为 Windows 用户，我希望 PowerShell 以绝对路径启动，而不是把裸文件名交给 node-pty。
   - 验收：可执行文件只存在于 PATH 最后一项时，解析结果是该绝对路径。
10. 作为调用方，我希望关闭终端时，忽略 SIGHUP 的前台进程也会退出。
    - 验收：前台 Node 进程忽略 SIGHUP 后，`kill()` 返回后该进程不再存活。

## 非功能要求

- 不提高协议主版本。`PROTOCOL_VERSION` 保持 `1.2.0`。
- 最终 stdout/stderr 默认仍最多保留 512KiB。
- 默认命令超时仍为 30 秒，上限 10 分钟。

## 完成定义

- [x] `design.md` / `tasks.md` 已齐
- [x] 对应自动化测试已在 `tasks.md` 列出并实现
- [x] README 说明 node-pty 为可选依赖
