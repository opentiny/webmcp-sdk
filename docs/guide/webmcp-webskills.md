# WebMCP + WebSkills：企业级智能化页面操控方案，兼顾极致安全与高效落地

### 🌟 情景再现：小明的“职场救赎”

这是小明入职这家大型电商平台公司的第一天。屁股还没坐热，老板就走过来丢下一个紧急任务：“小明，有个大客户叫王五，因为百亿补贴活动，我们需要给他补发一个 1000 元的价保申请单。你赶紧操作一下，客户等着呢。”

小明愣住了。作为刚入职不到两小时的新人，他甚至连后台系统的入口、各级菜单的功能都还没摸清，更别提复杂的价保审核流程和财务对账逻辑了。看着老板匆忙离去的背影，小明坐在工位上对着密密麻麻的业务后台菜单发呆，心里焦虑万分，又不敢在这时候去打扰忙碌的老板请教这种“基础操作”。

这时，坐在旁边的小红看出了小明的窘迫，笑着指了指屏幕右下角的图标：“别愁啦，咱们公司的管理后台集成了 **WebMCP + WebSkills** 智能系统。你直接跟它说话就行。”

小明半信半疑地打开助手，试着输入了一句：**“帮我给用户王五创建一个价保申请单，金额 1000 元，原因为百亿补贴。”**

奇迹发生了！系统立刻自动定位到了用户管理模块，识别了王五的身份，并调取了相关的订单信息。几秒钟后，屏幕上直接弹出了一个预填好的申请单确认框，上面清晰地列出了所有申请细节，并提示：“已为您准备好价保申请单，请确认无误后点击‘提交’。”

小明屏住呼吸，轻轻一点确认按钮，任务圆满完成。

原本以为要折腾一上午的复杂业务，竟然在一句话之间就解决了。这个“神操作”不仅让小明保住了入职第一天的体面，更让他真实感受到了智能化应用带来的效率革命。

---

> [!TIP]
> **以下是模拟小明操作的视频演示（欢迎访问 [在线演示地址](https://ai.opentiny.design/ai-vue/) 亲自体验）：**
> <video src="../assets/video/WebMCP+WebSkills.mov" controls width="100%" style="max-height: 500px;"></video>

---

> **内容摘要**：本文深度解析了 **WebMCP + WebSkills** 这套专为前端页面驱动设计的“组合拳”方案。通过解决现有自动化方案（无障碍适配、视觉模型）在**安全性、成本及适配难度**上的核心痛点，提供了 Vue、Angular 及 React 三大主流技术栈的工程级最佳实践。同时，借助 **WebAgent 远程遥控**，用户只需手机扫码或输入识别码，即可通过移动端直接遥控桌面页面——这是 WebMCP 在交互体验上的重大突破。

## 1. 背景与痛点

## 1.1 场景引子：为什么页面自动化这么难？

做前端工程、AI业务接入的小伙伴，是不是都有过这样的崩溃时刻？想实现页面自动化操作，要么被各种方案的坑绊住脚，要么配置复杂到让人头大，好不容易跑通还面临安全隐患……别慌！这篇文档要介绍的“组合拳”——WebMCP+WebSkills，就是帮你在**不大改现有系统**的前提下，把页面操作做得又稳又安全。

![崩溃的前端开发：被 BUG 和超时淹没](../assets/images/guide/programmer_meltdown.jpeg)

## 1.2 业界主流方案与痛点

在 WebMCP 出现之前，咱们做页面操作自动化，主流就两种方案，但说句实在话，用起来都让人一言难尽：

**方案一：基于无障碍信息（如 chrome-devtools-mcp）**
要求业务系统页面做好完善的无障碍信息适配，可现实里很多老项目根本做不到；且执行带有不确定性，依赖浏览器扩展或 playwright，兼容性差。

**方案二：基于视觉模型截图操作**
视觉模型特别消耗 token，成本高；执行速度慢；对复杂业务逻辑的理解极易出现幻觉。

**共同致命伤：安全不可控**
需要获取页面透明的 DOM 或视觉信息，缺乏底层管控，存在数据泄露隐患。

## 1.3 WebMCP + WebSkills 的定位：标准核心，原生优先

**WebMCP 不是“替代者”，而是“最强补充”**：
我们强烈推荐直接使用浏览器标准的 **`navigator.modelContext`** 接口。通过调用 SDK 的 **`initializeBuiltinWebMCP()`**，你将获得全平台 Polyfill 支持。标准的 API 极大简化了适配成本，让智能化接入变得更轻量、高效且面向未来。

**WebSkills：让 AI 真的“懂你的业务”**：
WebSkills 能进一步增强 AI 对业务的理解能力，尤其在处理跨页面逻辑时提供精准的语义导航。

**WebAgent 远程遥控：杀手级特性**：
用户扫描二维码或输入识别码，即可在手机上通过自然语言指令遥控桌面浏览器页面。原理已作为原生能力集成在 Builtin WebMCP 架构中，无需重复配置。

---

## 2. 三大技术栈最佳实践总览

## 2.1 Vue 工程最佳实践（摘要）

> [!IMPORTANT]
> **标准首选**：在 Vue 工程中，我们强烈建议通过调用 `initializeBuiltinWebMCP()` 激活浏览器内置服务。
> 源码工程：[`packages/doc-ai`](https://github.com/opentiny/next-sdk/tree/dev/packages/doc-ai)

**步骤 1：安装依赖**
```bash
pnpm add @opentiny/next-sdk @opentiny/next-remoter
```

**步骤 2：在 `main.ts` 中激活内置 API**
```ts
// src/main.ts
import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import { setNavigator, initializeBuiltinWebMCP } from '@opentiny/next-sdk'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'

setNavigator(async (route) => {
  const failure = await router.push(route)
  if (failure && !isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    throw new Error(`页面跳转失败: ${(failure as any).message}`)
  }
})

// 激活浏览器内置 WebMCP 服务 (低版本自动注入 Polyfill)
initializeBuiltinWebMCP()

createApp(App).use(router).mount('#app')
```

**步骤 3：配置业务路由**
```ts
// src/router/index.ts
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/home/index.vue') },
    { path: '/product-list', component: () => import('../views/product-list/index.vue') }
  ]
})
```

**步骤 4：配置 WebAgent 远程服务（可选：仅远程操控场景需要）**
```ts
// src/mcp-servers/useWebAgentServer.ts
import { WebMcpClient } from '@opentiny/next-sdk'
const client = new WebMcpClient()

export const useWebAgentServer = async () => {
  const { sessionId } = await client.connect({
    agent: true,
    builtin: true,
    url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
  })
  return { sessionId }
}
```

**步骤 5：在业务页面中注册工具**
```vue
<!-- src/views/product-list/index.vue -->
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  // ✅ 推荐：直接使用浏览器标准接口进行注册流程
  navigator.modelContext.registerTool({
    name: 'product-guide',
    title: '产品指南',
    description: '获取产品详细信息',
    inputSchema: {
      type: 'object',
      properties: { productId: { type: 'string' } }
    },
    execute: async ({ productId }) => {
      return { content: [{ type: 'text', text: `已找到商品 ${productId}` }] }
    }
  })
})

onUnmounted(() => navigator.modelContext.unregisterTool('product-guide'))
</script>
```

> [!TIP]
> **进阶：分离式注册（Next-SDK 独家增强 API）**
> 对于需要全局感知工具的场景，你可以将 Metadata 集中定义在全局，而在具体页面中仅编写对应的执行 Handler：
> 1. 全局调用 `navigator.modelContext.registerTool({ ...routeConfig: { route: '/path' } })`（无 execute）。
> 2. 页面内调用 `registerPageTool({ route: '/path', handlers: { ... } })` 绑定实现逻辑。

**步骤 6：在 App.vue 中挂载 Remoter + 接入远程遥控**
```vue
<!-- src/App.vue -->
<template>
  <router-view />
  <TinyRemoter
    :show="true"
    :skills="skillMdModules"
    :mcpServers="mcpServers"
    :menuItems="menuItems"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { useWebAgentServer } from './mcp-servers/useWebAgentServer'

const skillMdModules = import.meta.glob('./skills/**/*', { query: '?raw', import: 'default', eager: true })

const mcpServers = {
  'builtin-webmcp': { type: 'builtin' as const, client: navigator.modelContextTesting }
}

const menuItems = ref<any[]>([])

onMounted(async () => {
  try {
    const result = await useWebAgentServer()
    if (result?.sessionId) {
      const url = `https://agent.opentiny.design/mcp?sessionId=${result.sessionId}`
      menuItems.value = [
        { action: 'remote-url', text: '遥控器链接', desc: url, active: true, showCopyIcon: true },
        { action: 'remote-control', text: '识别码', desc: result.sessionId.slice(-6), showCopyIcon: true }
      ]
    }
  } catch (err) {
    console.warn('[WebAgent] 远程遥控初始化失败：', err)
  }
})
</script>
```

---

## 2.2 Angular 工程最佳实践（摘要）

> [!IMPORTANT]
> **架构升级**：Angular 主应用激活 **内置 WebMCP (Polyfill)**，在业务页面内直接注册工具。对话组件作为 iframe 嵌入，通过 `window.parent` 访问父窗体的测试接口。
**步骤 1：激活内置服务**
```ts
// src/app/app.component.ts
import { setNavigator, initializeBuiltinWebMCP } from '@opentiny/next-sdk'
// ...
async ngOnInit() {
  setNavigator(async (route) => { this.router.navigateByUrl(route); })
  initializeBuiltinWebMCP()
}
```

**步骤 2：在 Angular 页面中注册工具**
```ts
// src/app/pages/product/product.component.ts
ngOnInit() {
  navigator.modelContext.registerTool({
    name: 'product-info',
    execute: async (args) => { /* 业务逻辑 */ }
  })
}
```

**步骤 3：iframe 内连接主应用服务器**
```vue
<!-- Remoter 子应用 App.vue -->
<script setup lang="ts">
const mcpServers = {
  'builtin-webmcp': {
    type: 'builtin' as const,
    // ⚠️ 核心点：跨 iframe 访问父窗口的测试接口
    client: (window.parent as any).navigator.modelContextTesting
  }
}
</script>
```

---

## 2.3 React 工程最佳实践

React 工程架构与 Angular 完全一致。主应用负责工具与页面逻辑，通过 iframe 挂载 Vue 编写的 Remoter UI，两者通过标准原生接口通讯。

---

## 3. 总结

WebMCP + WebSkills + WebAgent 为前端页面操作提供了极致安全、高效且省钱的的最优解。通过 **Browser-Native First** 的理念，你只需遵循标准 API 即可在任何框架下实现智能化升级。

| 特性 | 说明 |
| --- | --- |
| **原生标准** | `navigator.modelContext` 接口已是事实上的首选方案 |
| **极简接入** | `initializeBuiltinWebMCP()` 一键搞定 Polyfill 与通讯 |
| **远程遥控** | 跨设备实时同步，这是 Builtin 架构带来的天然优势 |
| **分离式注册** | Next-SDK 提供的独家 API，专为大型复杂架构设计 |

未来我们将持续迭代，致力于让每一个 Web 应用都能进化为自适应的智能体。
