# 网站原生工具开发指南 (WebMCP)

本文档将详细介绍如何在 AI Extension 中为特定域名开发专属的 MCP 工具。

通过利用原生 `document.modelContext.registerTool` API，开发者可以极低成本地将前端页面的业务能力暴露给 AI 助手，从而实现“大模型直接操作业务后台”。

## 一、架构流转原理

1. 插件监控用户访问的 URL（如 `opentiny.design`）。
2. 在 `mcp-servers/` 目录下寻找对应的域名文件夹（例如 `mcp-servers/opentiny.design/`）。
3. 如果存在，插件会将该目录下的 `index.ts` 脚本**直接注入到页面的 MAIN World（主世界）**中。
4. 脚本执行时调用 `document.modelContext.registerTool` 注册工具。
5. 插件通过 Content Script 收集页面注册的工具，并发送 `list_changed` 动态刷新 MCP 工具列表，告知远端/本地 Agent 当前页面可用的专属能力。

## 二、开发步骤

### 1. 创建域名目录
在 `packages/next-wxt/mcp-servers/` 目录下，创建一个与你的目标域名完全一致的文件夹。
例如：`packages/next-wxt/mcp-servers/example.com/`

### 2. 编写工具逻辑 (`index.ts`)
在刚创建的目录下新建 `index.ts`，由于代码会被注入到主世界，你可以完全访问 `window`、`document` 以及所有页面的 JS 变量和状态。

```typescript
// packages/next-wxt/mcp-servers/example.com/index.ts

/**
 * 此文件由 content script 通过 scripting.executeScript 注入到 example.com 的 JS 上下文中执行。
 * 拥有完整的页面执行权限，不受 CSP 限制。
 */

if ((document as any).modelContext) {
  (document as any).modelContext.registerTool({
    name: 'claim-coupon',
    title: '抢优惠券',
    description: '帮助用户在活动页面一键领取专属优惠券。',
    // 采用标准的 JSON Schema 描述输入参数
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: '需要领取的面额，如 50 或 100' }
      },
      required: ['amount']
    },
    // execute 回调接受 AI 决定好的参数
    execute: async (args: { amount: number }) => {
      try {
        // 直接调用页面的业务函数（假设页面挂载了全局的 AppAPI）
        const success = await window.AppAPI.claimCoupon(args.amount);
        return {
          content: [{ type: 'text', text: success ? `成功领取 ${args.amount} 元优惠券！` : '领取失败，库存不足' }]
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `接口异常: ${error.message}` }]
        };
      }
    }
  });
}
```

### 3. 配置扩展元数据 (`meta.ts`)
如果你需要定义此工具的辅助信息，如将其内置加入“插件市场”，可以在同目录下新建 `meta.ts`。

```typescript
// packages/next-wxt/mcp-servers/example.com/meta.ts
export default {
  // 如果你有专属的外部云端 Agent 或服务端 MCP，可以通过以下配置聚合到市场面板中
  customMarketMcpServers: [
    {
      id: 'example-cloud-mcp',
      name: 'Example 专属云端能力',
      url: 'https://api.example.com/mcp/sse',
      type: 'sse',
      enabled: true
    }
  ]
};
```
*注：复杂的 `toolsJumpLinks` 或多页流程代理编排已不再推荐，建议复杂流程直接下发至对应页面的单一 WebMCP 脚本中解决。*

## 三、调试与验证

1. 在项目根目录运行 `pnpm dev:wxt`。
2. 打开浏览器并刷新目标页面（`example.com`）。
3. 当页面加载完成后，打开控制台，或者连接远程 Cursor Agent，由于发送了 `notifications/tools/list_changed`，你将立刻看到新注册的 `claim-coupon` 工具。
4. 尝试向 Agent 发送对话：“帮我抢一张 50 元的优惠券”，观察 Agent 调用情况与页面状态变更。

## 四、最佳实践与注意事项

1. **直接调用业务逻辑优先**：如果页面基于 React/Vue，你可以在 `index.ts` 中通过 Fiber 树搜索或者在业务代码中显式挂载 `window.__MyApp` 供扩展调用，避免脆弱的 `document.querySelector().click()` 模拟。
2. **错误处理**：`execute` 函数中必须捕获所有可能抛出的错误，并转换为合法的 `content` 返回给模型，否则会导致模型调用链中断。
3. **参数描述清晰**：`description` 与 `inputSchema` 是大模型判断是否使用工具以及如何传参的**唯一依据**，务必描述详尽。
