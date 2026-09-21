# Spec：合并 WXT 扩展桥接模式与双向通信能力 - design.md

## 方案概述

采用“适配器分层 + 预检模式路由 + 统一命令语义”的架构设计：
1. **预检路由 (`extractMode`)**：在 Commander 解析前拦截 `--mode cdp/wxt` 或环境变量 `WEBMCP_MODE`。CDP 保持原有 Commander 流水线；WXT 走独立 WXT 处理流，完全消除选项命名冲突。
2. **统一适配器接口 (`BrowserAdapter`)**：抽象 `getState`、`callTool`、`tabs` 等高频方法，分别由 `CdpBrowserAdapter`（基于 Puppeteer CDP）和 `WxtBrowserAdapter`（基于 WebSocket 桥接客户端）实现。
3. **双向桥接服务与守护进程 (`bridge/`)**：封装跨平台 `BashExecutor`（支持超时控制、平台安全规范）、`WorkspaceManager`（工作空间路径白名单限制）、`BridgeClient`（自适应 Server 模式，处理来自扩展的 `system/bash`、`workspace/selectDirectory` 等反向 RPC 调用）。
4. **统一 MCP Server 映射 (`mcp/`)**：提供标准 MCP 协议支持，可通过 `--mode` 切换 CDP 或 WXT 底层，并提供 `--agent` 子代理委托模式。

## 涉及模块 / 文件

- `packages/webmcp-cli/src/bin.ts`：模式提取、双分支路由、生命周期子命令
- `packages/webmcp-cli/src/bridge/`：
  - `protocol.ts`：WS 协议常量、错误码、方法名定义
  - `types.ts`：领域类型与数据载荷
  - `bash-executor.ts`：跨平台 Bash 执行
  - `workspace-manager.ts`：工作空间安全管理
  - `directory-picker.ts`：系统原生目录选择对话框
  - `bridge-client.ts`：WS 桥接与双向 RPC 处理
  - `daemon.ts`：后台常驻进程自动探测与保活
- `packages/webmcp-cli/src/adapters/`：
  - `interface.ts`：`BrowserAdapter` 抽象契约
  - `cdp-adapter.ts`：CDP 具体实现
  - `wxt-adapter.ts`：WXT 具体实现
- `packages/webmcp-cli/src/mcp/`：统一 Schema 与双模式 MCP Server
- `packages/webmcp-cli/src/commands/agent.ts`：WXT 专属高层子代理委托
- `packages/webmcp-cli/src/commands/skills.ts`：WXT 专属扩展技能查看
- `packages/webmcp-cli-skill/`：独立的 CDP 与 WXT Agent 指南

## 核心数据结构 / 类型定义

```typescript
export interface BrowserAdapter {
  getState(tabId?: string | number): Promise<BrowserStateResult>
  callTool(name: string, args: Record<string, unknown>, tabId?: string | number): Promise<unknown>
  tabs(action: 'open' | 'close' | 'switch' | 'back' | 'forward', options?: TabsOptions): Promise<unknown>
  dispose(): Promise<void>
}
```

## 依赖变更

- `ws`：处理与 Chrome 扩展的 WebSocket 桥接连接
- `@modelcontextprotocol/sdk`：实现标准 MCP Server 支持
- `zod`：定义统一的 MCP 工具输入契约

## 风险与兼容

- **向下兼容**：无参数调用 `webmcp-cli` 时维持 100% 原有 CDP 行为，原参数如 `-t`、`-w`、`-f` 语义不受任何破坏。
- **Token 路径兼容**：沿用 `~/.robot-wxt/bridge-token`，保证现有已安装 Tiny Robot 扩展的用户无感知平滑连接。
