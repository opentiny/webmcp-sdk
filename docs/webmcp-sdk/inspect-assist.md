# enableInspectAssist（DOM 元素检视辅助）

> [!NOTE]
> 自 `@opentiny/next-sdk` **v0.4.6** 版本起提供此功能。

`enableInspectAssist` 是一个**仅供开发调试使用**的浏览器侧辅助工具。启用后，开发者可以在页面上点选任意 DOM 元素，将其结构化元信息（标签摘要、CSS 路径、属性、计算样式、尺寸位置、文本内容）一键复制成 **Cursor/AI 友好的纯文本卡片**，直接粘贴进对话框描述修改需求，无需手动翻 DevTools。

> [!IMPORTANT]
> 本功能属于开发阶段辅助工具，**不应在生产环境中启用**。建议通过 `import.meta.env.DEV` 或构建时环境变量做条件引入。

## 导入路径

```typescript
import { enableInspectAssist, disableInspectAssist } from '@opentiny/next-sdk/dev'
```

## 快速开始

```typescript
import { enableInspectAssist } from '@opentiny/next-sdk/dev'

// 仅在开发模式下启用
if (import.meta.env.DEV) {
  enableInspectAssist()
}
```

启用后页面右下角会出现一个可拖动的浮钮（FAB）。点击浮钮进入检视模式，此时鼠标变为十字准星；点选页面任意元素，元信息将自动写入剪贴板，粘贴到 AI 对话框即可。

---

## API 说明

### `enableInspectAssist(options?)`

启用 Inspect Assist 单例（幂等：多次调用只会更新配置，不会重复挂载）。

**类型签名**

```typescript
function enableInspectAssist(options?: InspectAssistOptions): InspectAssistHandle
```

**参数**

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `options` | `InspectAssistOptions`（可选） | 配置项，见下文 |

**返回值**：`InspectAssistHandle` — 控制句柄。

在 SSR / 非浏览器环境中调用时，会返回一个安全的空操作句柄（noop），不会抛错。

---

### `disableInspectAssist()`

销毁全局 Inspect Assist 单例，移除浮钮、快捷键和所有事件监听。

```typescript
function disableInspectAssist(): void
```

---

## InspectAssistOptions 配置项

```typescript
interface InspectAssistOptions {
  /** FAB 空闲状态下显示的文案，默认 'Inspect' */
  brandLabel?: string
  /** 是否显示右下角浮钮，默认 true。设为 false 时仍可通过快捷键切换检视态 */
  showFab?: boolean
  /** 复制成功的回调，可用于自定义通知或日志 */
  onCopied?: (text: string, meta: ElementMeta) => void
}
```

**示例：自定义浮钮文案 + 复制回调**

```typescript
import { enableInspectAssist } from '@opentiny/next-sdk/dev'

if (import.meta.env.DEV) {
  enableInspectAssist({
    brandLabel: 'Pick',   // 浮钮显示 "Pick"
    onCopied: (text, meta) => {
      console.log('已复制元素：', meta.element)
      // 可以接入自己的 toast 通知
      showToast(`已复制：${meta.element}`)
    },
  })
}
```

**示例：仅使用快捷键，不显示浮钮**

```typescript
enableInspectAssist({ showFab: false })
// 依然可以通过 Cmd/Ctrl+Shift+C 切换检视模式
```

---

## 交互方式

| 操作 | 效果 |
| :--- | :--- |
| 点击浮钮 | 进入 / 退出检视模式 |
| `Cmd+Shift+C`（macOS）/ `Ctrl+Shift+C`（Windows/Linux） | 切换检视模式 |
| 检视模式中移动鼠标 | 高亮悬浮元素（显示蓝色轮廓框） |
| 检视模式中点击元素 | 复制元素元信息到剪贴板 |
| `Esc` | 退出检视模式（浮钮保留） |
| 点击浮钮右侧 `×` | 收起为迷你圆形入口（位置会被 sessionStorage 记忆） |
| 拖动浮钮 | 调整浮钮位置（位置持久化到 sessionStorage） |

---

## 复制内容格式

点击元素后，剪贴板写入以下结构的纯文本，格式对齐 **Cursor 元素卡片**，可直接粘贴进 AI 对话框：

```text
当前选中的元素是：<div class="guide-box">

ELEMENT
<div class="guide-box">
PATH
div#app > section.content > div.guide-box
ATTRIBUTES
class: guide-box
data-testid: guide
COMPUTED STYLES
color: rgb(51, 51, 51)
backgroundColor: rgba(0, 0, 0, 0)
fontSize: 16px
fontFamily: -apple-system, BlinkMacSystemFont, "Segoe UI", ...
display: flex
position: relative
POSITION & SIZE
top: 403px
left: 466.5px
width: 1152px
height: 251.4219px
INNER TEXT
了解更多关于 OpenTiny 的信息

请输入修改意见：
```

### 复制的计算样式字段

默认输出以下 6 个 CSS 计算属性（对齐 Cursor 卡片常用字段）：

| 字段 | 说明 |
| :--- | :--- |
| `color` | 文字颜色 |
| `backgroundColor` | 背景色 |
| `fontSize` | 字号 |
| `fontFamily` | 字体族 |
| `display` | 布局模式 |
| `position` | 定位方式 |

---

## ElementMeta 数据结构

如需在 `onCopied` 回调中处理结构化元信息，可引入 `ElementMeta` 类型：

```typescript
import type { ElementMeta, ElementPosition, ElementAttribute } from '@opentiny/next-sdk/dev'

interface ElementMeta {
  /** 元素开标签摘要，如 `<div class="guide-box">` */
  element: string
  /** CSS 祖先路径，如 `div#app > section > div.guide-box` */
  path: string
  /** 元素所有属性（不含内部辅助属性） */
  attributes: ElementAttribute[]
  /** 计算样式键值对 */
  computedStyles: Record<string, string>
  /** 元素位置和尺寸（基于视口坐标） */
  position: ElementPosition
  /** 元素的 innerText（超长时中间截断，最多 2048 字符） */
  innerText: string
}

interface ElementPosition {
  top: number
  left: number
  width: number
  height: number
}

interface ElementAttribute {
  name: string
  value: string
}
```


---

## 在 Vue 项目中集成

```typescript
// main.ts
import { createApp } from 'vue'
import { enableInspectAssist } from '@opentiny/next-sdk/dev'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')

// 仅在开发模式下启用
if (import.meta.env.DEV) {
  enableInspectAssist({
    brandLabel: 'Inspect',
    onCopied: (_text, meta) => {
      console.log('[InspectAssist] 复制：', meta.path)
    },
  })
}
```

---

## 在 Angular 项目中集成

```typescript
// main.ts
import { isDevMode } from '@angular/core'
import { enableInspectAssist } from '@opentiny/next-sdk/dev'

// 仅在开发模式下启用
if (isDevMode()) {
  enableInspectAssist()
}
```

