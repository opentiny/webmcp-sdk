# registerPageAgentTool

在浏览器环境中注册 `page-agent-tool` 工具。该工具供 AI Agent 自动读取当前页面状态（自动生成 ARIA 无障碍树并支持增量 Diff），以及在页面上执行自动点击、输入填单、下拉选择、滚动和自定义 JS 执行等操作。

调用此方法会自动触发 `initializeBuiltinWebMCP()`。

**类型签名**

```typescript
import { PageAgentToolOptions } from '@opentiny/next-sdk'

export function registerPageAgentTool(options?: PageAgentToolOptions): void
```

## PageAgentToolOptions 配置项说明

| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `enableHighlight` | `boolean` | `false` | 是否在页面中高亮标注可交互的元素。 |
| `a11yConfig` | `A11yConfig` | - | 统一无障碍配置，见下文「统一无障碍配置 `a11yConfig`」。 |

`PageAgentToolOptions` 中的所有配置项（含 `enableHighlight` 与 `a11yConfig`）都由同一个 `PageAgentToolConfig` 类型描述，只有唯一一套运行期读写 API：`getPageAgentToolConfig`/`setPageAgentToolConfig`。除了在 `registerPageAgentTool(options)` 时初始化一次，也可以在页面运行期随时读取/修改（例如路由切换后为新页面追加规则、临时关闭高亮）：

```typescript
import { registerPageAgentTool, getPageAgentToolConfig, setPageAgentToolConfig } from '@opentiny/next-sdk'

registerPageAgentTool({ enableHighlight: true, a11yConfig: { exposedAttributes: ['data-v-id'] } })

// 中途关闭高亮（例如进入某个不希望展示高亮框的页面/场景）
setPageAgentToolConfig({ enableHighlight: false })

// a11yConfig 会与当前生效配置按数组拼接合并（不丢已有规则），enableHighlight 则是覆盖式更新，两者互不影响
setPageAgentToolConfig({
  a11yConfig: { states: { selected: { selector: '.new-page .btn.is-checked' } } },
})

// 函数式更新：入参为当前生效配置，可用于按条件移除某条旧规则后再合并（不会因再次合并而复活）
setPageAgentToolConfig((current) => ({
  a11yConfig: { roles: current.a11yConfig.roles.filter((r) => r.role !== 'tab') },
}))

// 完全推倒重来：mode: 'replace' 不与当前配置合并，而是与默认配置重新合并
setPageAgentToolConfig({ a11yConfig: { roles: [{ role: 'tab', selector: '.v2-tabs .item' }] } }, { mode: 'replace' })

// 随时读取当前最终生效的合并结果，用于调试
getPageAgentToolConfig() // { enableHighlight: false, a11yConfig: { roles: [...], states: {...}, ... } }
```

---

## 统一无障碍配置 `a11yConfig`

许多站点的无障碍信息并不完整：自定义 Tab 组件没有 `role="tab"`，按钮组的选中态是通过特殊 class 名标记而非 `aria-selected`，报错文字用特定颜色而非 `role="alert"`……这些"隐藏的语义"如果不补齐，`page-agent-tool` 生成的无障碍树就会丢失大量信息，导致 AI 误判。

`a11yConfig` 就是为了解决这个问题：通过声明式规则（按角色 `roles`、按状态 `states`）+ 白名单/黑名单/自定义属性/弹窗选择器，把这些"隐藏语义"显式地告诉 `page-agent-tool`。所有规则与内置默认值（ARIA 标准 + 主流 UI 框架的错误/警告/选中态检测）按数组拼接合并，只需要写"新增的规则"，不会丢失内置行为。

### A11yConfig 类型

```typescript
interface A11yMatcher {
  /** CSS 选择器（优先使用；仅当选择器表达不了时再写 match）。
   *  - roles：用 matches 仅匹配自身（避免角色传染给子孙）
   *  - states：用 closest 匹配自身或祖先（适合挂在容器上的 error/selected）
   *  支持标签/属性/id/组合选择器，也支持字符串数组（任意一个命中即可） */
  selector?: string | string[]
  /** 自定义判断函数，优先级高于 selector，用于读取计算样式等选择器表达不了的场景 */
  match?: (el: Element) => boolean
}

interface A11yRoleRule extends A11yMatcher {
  /** 命中后赋予的 ARIA 角色，如 'tab' | 'tabpanel' | 'switch' | 'navigation' */
  role: string
  /** 为 true 时覆盖元素已有的显式 role 属性，默认 false */
  force?: boolean
  /**
   * 可选声明可访问名（不改 DOM，不写 aria-label）。
   * 适用于 landmark / 布局容器：页面本身无 aria-label，且子树多为交互节点时，
   * 若缺少声明名会被剪枝穿透；写上 name 后 YAML 会保留分区结构，例如：
   * `- navigation "侧边导航"`。
   */
  name?: string
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
    // 布局 landmark：补齐角色 + 声明分区名（不改 DOM）
    { role: 'navigation', selector: 'ti-app-layout-left', name: '侧边导航' },
    { role: 'main', selector: 'ti-app-layout-main', name: '主内容区' },
  ],
  states: {
    // 按钮组选中态：新旧版本混用了两套 class 命名，selector 传数组，命中任意一个即可，而非 aria-selected
    selected: { selector: ['.btn-group .btn.is-checked', '.btn-group .btn.is-active'] },
    current: { selector: '[data-step-status="current"]' }, // 向导当前步骤：属性选择器
    warning: { selector: '.form-tip--warn' },
    error: { match: (el) => getComputedStyle(el).color === 'rgb(245, 34, 45)' }, // 通过文字颜色判断报错
  },
  whitelist: ['.custom-clickable-card'],
  blacklist: ['.tracking-pixel'],
})

registerPageAgentTool({ a11yConfig })
```

无障碍树中会呈现为：

```yaml
- navigation "侧边导航":
    - link #1 "总览"
- main "主内容区":
    - button #2 "购买"
```

### 站点预设：云控制台（consoleCloud）

针对云控制台（Tiny3 + Angular）缺少 role/aria 的常见结构，SDK 导出了可直接使用的预设：

```typescript
import {
  registerPageAgentTool,
  consoleCloudPageAgentToolOptions,
  isConsoleCloudHost,
} from '@opentiny/next-sdk'

if (isConsoleCloudHost()) {
  registerPageAgentTool(consoleCloudPageAgentToolOptions)
} else {
  registerPageAgentTool()
}
```

预设会补齐：

- **布局 landmark**（`ti-app-layout-*` / `tp-layout-*`）：`navigation`（侧边导航）、`main`（主内容区）、`banner`（页面头部）、`region`（页面内容/正文）、`complementary`（右侧面板），均带 `name` 声明分区名
- Tab（`.ti3-tabs-text`）、下拉（`ti3-select-dominator`）、服务列表图标按钮、区域选项等角色/选中态
- 暴露 `cf-uba` / `data-qa-id` / `name` 等属性 token

`webmcp-cli` 注入时会按域名自动选用该预设。

### 底层解析函数：`resolveA11yInfo` / `resolveA11yRole` / `resolveA11yStates`

`page-agent-tool` 内部对每个 DOM 节点也是调用这些函数来计算角色和状态 token，它们同样导出给用户直接调用，可用于调试规则是否命中，或在业务代码（埋点、自定义面板等）中复用同一套判断逻辑：

```typescript
import { resolveA11yInfo } from '@opentiny/next-sdk'

resolveA11yInfo(document.querySelector('.tab-item')!, a11yConfig)
// { role: 'tab', tokens: ['selected'] }

resolveA11yInfo(document.querySelector('ti-app-layout-left')!, a11yConfig)
// { role: 'navigation', tokens: [...], name: '侧边导航' }
```

> 命中带 `name` 的 role 规则时，`resolveA11yInfo` 会多返回可选字段 `name`（与 YAML 中的声明可访问名一致）。

> `a11yConfig` 的运行期读写统一走上文「PageAgentToolOptions 配置项说明」中介绍的 `getPageAgentToolConfig`/`setPageAgentToolConfig`，不再有单独的 `getA11yConfig`/`setA11yConfig`。

### `window.__webmcpcli_beforeGetBrowserState` 钩子

`window.__webmcpcli_beforeGetBrowserState`（类型 `(() => void) | null`）会在每次获取浏览器状态前触发，是"中途动态修改配置"的天然接入点，可在其中根据当前路由/页面状态调用 `setPageAgentToolConfig`：

```typescript
import { registerPageAgentTool, setPageAgentToolConfig } from '@opentiny/next-sdk'

registerPageAgentTool({
  enableHighlight: true,
  a11yConfig: { exposedAttributes: ['data-v-id'] },
})

// 某些列表在每次渲染后 DOM 结构才能确定，可以在这里用选择器声明式地追加白名单，
// 而不需要手动收集 Element 引用（whitelist 支持的选择器字符串本身就是动态解析的）
window.__webmcpcli_beforeGetBrowserState = () => {
  setPageAgentToolConfig({ a11yConfig: { whitelist: ['.dynamic-list .row'] } })
}
```
