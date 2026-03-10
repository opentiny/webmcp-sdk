# createRemoter 函数

```typescript
import { createRemoter } from '@opentiny/next-sdk'
```

`createRemoter` 函数用于创建一个智能遥控器浮动块组件，它提供了一个悬浮在页面右下角的交互式浮动按钮，包含二维码生成、AI对话和遥控指令等功能。

## 功能特性

- **浮动按钮**: 固定在页面右下角的圆形浮动按钮
- **下拉菜单**: 点击浮动按钮展开功能菜单
- **二维码生成**: 生成包含会话ID的二维码，支持移动端扫码
- **AI对话**: 可自定义AI对话功能回调
- **识别码**: 提供识别码输入界面
- **远程URL**: 提供远程URL输入界面

## 基本使用

```typescript
import { createRemoter } from '@opentiny/next-sdk'

// 创建遥控器实例
const remoter = createRemoter({
  qrCodeUrl: 'https://your-app.com/remote-control',
  sessionId: 'your-session-id',
  onShowAIChat: () => {
    // 当用户点击悬浮按钮时触发，可在此处打开自定义的AI对话界面
  }
})
```

## 配置参数

| 参数         | 类型             | 必填 | 默认值                                     | 说明                   |
| ------------ | ---------------- | ---- | ------------------------------------------ | ---------------------- |
| sessionId    | string           | ❌   | -                                          | 被遥控页面的会话ID；不传时仅显示「打开对话框」，不显示扫码/识别码/遥控器链接 |
| qrCodeUrl    | string           | ❌   | https:\/\/ai.opentiny.design\/next-remoter | 遥控端页面地址         |
| logoUrl      | string           | ❌   | -                                          | 悬浮AI LogUrl地址      |
| onShowAIChat | function         | ❌   | -                                          | 显示AI对话框的回调函数 |
| menuItems    | MenuItemConfig[] | ❌   | 默认配置                                   | 菜单项配置数组         |

### 1. `qrCodeUrl` 配置

`qrCodeUrl`是设置了扫码后跳转到的网址，默认为：`https://ai.opentiny.design/next-remoter`，该网址默认展示一些办公场景的标题和提示词。
如果需要定制网址上的默认信息，可以在地址后面拼接一些请求参数，比如 qrCode:'<https://ai.xxx/xxx?title=AI助手&welcome-title=办公AI助手'。>

目前它支持以下请求参数：

| 参数          | 类型        | 默认值                                                   | 说明                                                                                         |
| ------------- | ----------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| lang          | zh-CN en-US | zh-CN                                                    | 遥控页面的一些默认描述，placeholder的国际化的key： lang=zh-CN                                |
| sessionId     | string      | ✅                                                       | 必须传入的变量。 由于 `createRemoter`中，它是必填，会自动拼接到qrCodeUrl后面，所以此处不需要 |
| agentRoot     | string      | https:\/\/agent.opentiny.design\/api\/v1/\webmcp-trial\/ | Agent地址                                                                                    |
| title         | string      | 'OpenTiny Next'                                          | 左上角标题                                                                                   |
| welcome-title | string      | ''                                                       | 正中标题 ： welcome-title=背景变变变                                                         |
| welcome-desc  | string      | ''                                                       | 正中标题下的描述                                                                             |
| promt         | string[]    | ''                                                       | 标题下面的介绍，允许多值： promt=你好&promt=世界                                             |
| suggestion    | string[]    | ''                                                       | 输入框上面的介绍，允许多值： suggestion=你好&suggestion=世界                                 |
| system-prompt | string      | ''                                                       | 对话llm 时，传入的 system message: system-prompt=你是一个智能助手，工作地点是深圳            |

### 2. onShowAIChat 回调函数

点击 `action="ai-chat"` 菜单时，会主动回调该函数。通常用在需要在当前应用中嵌入一个 `AI Chat Dialog`的场景。

**示例1 在Vue应用的右侧嵌入一个对话弹窗**

```typescript
<template>
  <tiny-remoter  v-model:show="show" ........> </tiny-remoter>
</template>

<script setup lang="ts">

const show=ref(false)

onMounted(()=>{
  createRemoter({
    // ...
    onShowAIChat(){
      show.value = !show.value
    }
  })
})

</script>

```

### 3. 菜单项配置

系统默认提供以下固定不变的三个菜单项action， 通过 `show`, `text`,`iconn` 定制菜单项：

1. **qr-code** - 弹出二维码
2. **ai-chat** - 弹出AI对话框
3. **remote-control** - 发送识别码
4. **remote-url** - 发送远程URL

MenuItemConfig 接口如下

```typescript
interface MenuItemConfig {
  /** 菜单项标识 */
  action: 'qr-code' | 'ai-chat' | 'remote-control' | 'remote-url'
  /** 是否显示该菜单项 */
  show?: boolean
  /** 菜单项文本 */
  text?: string
  /** 菜单项图标SVG */
  icon?: string
  /** 是否显示复制图标 */
  showCopyIcon?: boolean
}
```

**示例1： 自定义菜单项显示**

```typescript
// 隐藏二维码菜单项
const remoter = createRemoter({
  sessionId: 'your-session-id',
  onShowAIChat: () => {
    console.log('显示AI对话框')
  },
  menuItems: [
    {
      action: 'qr-code',
      show: false // 隐藏二维码菜单项
    }
  ]
})
```

**示例2： 自定义菜单项文本**

```typescript
// 自定义菜单项文本
const remoter = createRemoter({
  sessionId: 'your-session-id',
  onShowAIChat: () => {
    console.log('显示AI对话框')
  },
  menuItems: [
    {
      action: 'ai-chat',
      text: '智能对话' // 自定义文本
    },
    {
      action: 'remote-control',
      text: '远程控制' // 自定义文本
    },
    {
      action: 'remote-url',
      text: '远程URL', // 自定义文本
      showCopyIcon: true // 显示复制图标
    }
  ]
})
```

**示例3： 完整配置示例**

```typescript
// 完整配置示例
const remoter = createRemoter({
  sessionId: 'your-session-id',
  qrCodeUrl: 'https://your-custom-url.com',
  onShowAIChat: () => {
    console.log('显示AI对话框')
  },
  menuItems: [
    {
      action: 'qr-code',
      show: true,
      text: '扫码连接',
      icon: `<svg>...</svg>` // 自定义图标
    },
    {
      action: 'ai-chat',
      show: true,
      text: 'AI助手'
    },
    {
      action: 'remote-control',
      show: false // 完全隐藏遥控指令菜单项
    },
    {
      action: 'remote-url',
      show: true,
      text: '远程URL',
      showCopyIcon: true // 显示复制图标
    }
  ]
})
```

## 销毁组件

```typescript
// 销毁组件，清理DOM和事件监听器
remoter.destroy()
```
