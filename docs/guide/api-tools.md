# 全局 API

主要介绍 `@opentiny/next-sdk` 导出的全局 API，包括内置 WebMCP 初始化、Page Agent 自动操作工具注册以及 AI SDK 兼容转换方法。

---

## initializeBuiltinWebMCP()

在浏览器环境中初始化内置的 WebMCP 运行环境。该函数会自动注入 `modelContext` Polyfill，并设置页面与宿主环境（如浏览器插件或父页面）的桥接通信通道。

**类型签名**

```typescript
export function initializeBuiltinWebMCP(): void
```

**代码示例**

```typescript
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

// 在页面入口处调用，用于初始化浏览器环境的 modelContext 桥接
initializeBuiltinWebMCP()
```

---

## registerPageAgentTool()

在浏览器环境中注册 `page-agent-tool` 工具。该工具供 AI Agent 自动读取当前页面状态（自动生成 ARIA 无障碍树并支持增量 Diff），以及在页面上执行自动点击、输入填单、下拉选择、滚动和自定义 JS 执行等操作。

调用此方法会自动触发 `initializeBuiltinWebMCP()`。

**类型签名**

```typescript
import { PageAgentToolOptions } from '@opentiny/next-sdk'

export function registerPageAgentTool(options?: PageAgentToolOptions): void
```

### PageAgentToolOptions 配置项说明

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `enableHighlight` | `boolean` | `true` | 是否在页面中高亮标注可交互的元素。 |
| `exposedAttributes` | `string[]` | `[]` | 允许在无障碍树（A11y Tree）节点中额外暴露的自定义 DOM 属性白名单。 |

### 高级全局配置 (`window` 属性)

如果需要针对特定的站点或页面微调 `page-agent-tool` 的行为，可以通过配置全局 `window` 对象上的属性来进行精细化控制：

- **`window.__webmcpcli_interactiveWhitelist`**: `Element[]` - 白名单元素列表。即便默认没有被识别为可交互的元素，若在此列表中也会被强制识别为可交互。
- **`window.__webmcpcli_interactiveBlacklist`**: `Element[]` - 黑名单元素列表。强制排除在可交互元素外。
- **`window.__webmcpcli_exposedAttributes`**: `string[]` - 额外暴露的自定义属性白名单，等同于 `options.exposedAttributes`。
- **`window.__webmcpcli_beforeGetBrowserState`**: `(() => void) | null` - 获取浏览器状态前的钩子函数，可在此动态更新黑白名单。
- **`window.__webmcpcli_errorSelectors`**: `string[]` - 表单校验错误元素的 CSS 选择器列表（用于检测页面中当前存在的表单报错信息，提醒 AI 优先修复）。
- **`window.__webmcpcli_dialogSelectors`**: `string[]` - 模态弹窗/遮罩层的 CSS 选择器列表（用于检测阻塞页面交互的弹窗，方便 AI 优先处理）。

**代码示例**

```typescript
import { registerPageAgentTool } from '@opentiny/next-sdk'

// 注册工具并开启高亮，同时暴露 data-v-id 自定义属性
registerPageAgentTool({
  enableHighlight: true,
  exposedAttributes: ['data-v-id']
})
```

---

## getAISDKTools()

将 `WebMcpClient` 的工具列表快速转换成 Vercel AI SDK 兼容的格式，方便大模型（如 `AgentModelProvider` 等）直接调用 MCP 暴露的工具。

**类型签名**

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'
import { ToolSet } from 'ai'

export function getAISDKTools(client: WebMcpClient): Promise<ToolSet>
```

**参数说明**

- `client: WebMcpClient` - 一个已连接并准备就绪的 `WebMcpClient` 实例。

**返回值**

- `Promise<ToolSet>` - 返回转换后的 Vercel AI SDK `dynamicTool` 工具集对象。

**代码示例**

```typescript
import { getAISDKTools, WebMcpClient } from '@opentiny/next-sdk'
import { generateText } from 'ai'

const client = new WebMcpClient()
// 连接到 MCP Server...
await client.connect(transport)

// 将 MCP 工具转换为 AI SDK 兼容工具
const tools = await getAISDKTools(client)

// 直接配合 AI SDK 使用
const result = await generateText({
  model: yourModelProvider,
  messages: [{ role: 'user', content: '请帮我查询当前的系统状态' }],
  tools
})
```
