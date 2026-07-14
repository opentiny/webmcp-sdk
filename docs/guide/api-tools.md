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
| `a11yConfig` | `A11yConfig` | - | 统一无障碍配置，见下文「统一无障碍配置 `a11yConfig`」。 |

---

## 统一无障碍配置 `a11yConfig`

许多站点的无障碍信息并不完整：自定义 Tab 组件没有 `role="tab"`，按钮组的选中态是通过特殊 class 名标记而非 `aria-selected`，报错文字用特定颜色而非 `role="alert"`……这些"隐藏的语义"如果不补齐，`page-agent-tool` 生成的无障碍树就会丢失大量信息，导致 AI 误判。

`a11yConfig` 就是为了解决这个问题：通过声明式规则（按角色 `roles`、按状态 `states`）+ 白名单/黑名单/自定义属性/弹窗选择器，把这些"隐藏语义"显式地告诉 `page-agent-tool`。所有规则与内置默认值（ARIA 标准 + 主流 UI 框架的错误/警告/选中态检测）按数组拼接合并，只需要写"新增的规则"，不会丢失内置行为。

### A11yConfig 类型

```typescript
interface A11yMatcher {
  /** CSS 选择器（用 closest 判断元素自身或祖先是否命中，支持 Shadow DOM 穿透）。
   *  不局限于类名：标签选择器（li）、属性选择器（[data-role="tab"]）、id 选择器、组合选择器均可 */
  selector?: string
  /** 自定义判断函数，优先级高于 selector，用于读取计算样式等选择器表达不了的场景 */
  match?: (el: Element) => boolean
}

interface A11yRoleRule extends A11yMatcher {
  /** 命中后赋予的 ARIA 角色，如 'tab' | 'tabpanel' | 'switch' */
  role: string
  /** 为 true 时覆盖元素已有的显式 role 属性，默认 false */
  force?: boolean
}

interface A11yConfig {
  /** 角色推断规则：弥补页面缺失的语义 role */
  roles?: A11yRoleRule[]
  /** 状态推断规则：key 为状态名（checked/selected/pressed/current/expanded/disabled/
   *  readonly/required/invalid/busy/error/warning，也支持任意自定义状态名），
   *  value 为一条或多条规则（命中任意一条即成立），与标准 aria-* 检测结果取"或" */
  states?: Partial<Record<string, A11yMatcher | A11yMatcher[]>>
  /** 白名单：强制识别为可交互元素并纳入无障碍树。支持 Element 引用或 CSS 选择器字符串 */
  whitelist?: Array<Element | string>
  /** 黑名单：强制从无障碍树中排除，规则同上 */
  blacklist?: Array<Element | string>
  /** 额外暴露的自定义 DOM 属性（作为 token 输出，如 [data-testid="xxx"]） */
  exposedAttributes?: string[]
  /** 模态弹窗 CSS 选择器（用于检测阻塞交互的弹窗） */
  dialogSelectors?: string[]
}
```

> `whitelist`/`blacklist` 中的字符串选择器每次构建无障碍树时都会动态解析（而非在注册时固化 `Element[]`），因此天然适配 SPA 路由切换、列表重渲染等场景。

### 使用示例：Tab、按钮组选中、报错文字颜色

```typescript
import { registerPageAgentTool, defineA11yConfig } from '@opentiny/next-sdk'

const a11yConfig = defineA11yConfig({
  roles: [
    { role: 'tab', selector: '.my-tabs .tab-item' },      // 自定义 Tab 组件没有 role=tab
    { role: 'tablist', selector: '.my-tabs__nav' },
  ],
  states: {
    selected: { selector: '.btn-group .btn.is-checked' }, // 按钮组选中态：特殊类名标记，而非 aria-selected
    current: { selector: '[data-step-status="current"]' }, // 向导当前步骤：属性选择器
    warning: { selector: '.form-tip--warn' },
    error: { match: (el) => getComputedStyle(el).color === 'rgb(245, 34, 45)' }, // 通过文字颜色判断报错
  },
  whitelist: ['.custom-clickable-card'],
  blacklist: ['.tracking-pixel'],
})

registerPageAgentTool({ a11yConfig })
```

### 底层解析函数：`resolveA11yInfo` / `resolveA11yRole` / `resolveA11yStates`

`page-agent-tool` 内部对每个 DOM 节点也是调用这些函数来计算角色和状态 token，它们同样导出给用户直接调用，可用于调试规则是否命中，或在业务代码（埋点、自定义面板等）中复用同一套判断逻辑：

```typescript
import { resolveA11yInfo } from '@opentiny/next-sdk'

resolveA11yInfo(document.querySelector('.tab-item')!, a11yConfig)
// { role: 'tab', tokens: ['selected'] }
```

### 运行期动态读写：`getA11yConfig` / `setA11yConfig`

除了在 `registerPageAgentTool({ a11yConfig })` 时初始化一次，也可以在页面运行期随时读取/修改当前生效的配置（例如路由切换后为新页面追加规则）：

```typescript
import { setA11yConfig, getA11yConfig } from '@opentiny/next-sdk'

// 中途追加/修改规则，自动与已有配置合并（数组拼接，不丢已有规则）
setA11yConfig({
  states: { selected: { selector: '.new-page .btn.is-checked' } },
})

// 函数式更新：入参为当前生效配置，可用于按条件移除某条旧规则后再合并
setA11yConfig((current) => ({
  roles: current.roles.filter((r) => r.role !== 'tab'),
}))

// 完全推倒重来：mode: 'replace' 不与当前配置合并，而是与默认配置重新合并
setA11yConfig({ roles: [{ role: 'tab', selector: '.v2-tabs .item' }] }, { mode: 'replace' })

// 随时读取当前最终生效的合并结果，用于调试
getA11yConfig()
```

### `window.__webmcpcli_beforeGetBrowserState` 钩子

`window.__webmcpcli_beforeGetBrowserState`（类型 `(() => void) | null`）会在每次获取浏览器状态前触发，是"中途动态修改配置"的天然接入点，可在其中根据当前路由/页面状态调用 `setA11yConfig`：

```typescript
import { registerPageAgentTool, setA11yConfig } from '@opentiny/next-sdk'

registerPageAgentTool({
  enableHighlight: true,
  a11yConfig: { exposedAttributes: ['data-v-id'] },
})

// 某些列表在每次渲染后 DOM 结构才能确定，可以在这里用选择器声明式地追加白名单，
// 而不需要手动收集 Element 引用（whitelist 支持的选择器字符串本身就是动态解析的）
window.__webmcpcli_beforeGetBrowserState = () => {
  setA11yConfig({ whitelist: ['.dynamic-list .row'] })
}
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
