---
outline: [2, 3]
---

# 远程遥控模式

## 一、远程模式的原理

![remoter.png](../guide/remoter.png)

在 [WebMCP 的适配场景](../guide/choose-scene.md) 中已经详细介绍过远程模式的原理。普通场景下，网站应用可能不需要远程遥控功能，只需在页面中使用原生 WebMCP 编写工具，直接供页面上的 Remoter 组件对话即可。此时无需引入 `WebAgent` 服务，参考 [快速开始](../index) 实现纯前端方案。

遥控模式的典型应用场景：

1. 跨浏览器的 AI 操作网页
2. 连接到其他智能体操作网页，例如 VS Code、CodeX、OpenCode 等
3. 类似 Chrome DevTools MCP、Browser Use 等工具的用途，支持 AI 操作网页、自动化测试等

## 二、私有化部署 WebAgent 服务

部署方法详见 [WebAgent 文档](https://docs.opentiny.design/web-agent/guide/getting-started) 或 [WebAgent 仓库](https://github.com/opentiny/web-agent/blob/main/README.zh-CN.md)。

它本质是一个 Node.js 服务，本地启动后提供一组 API 接口（如 ping、list、mcp 等）。在 `TinyRemoter` 的 `agentRoot` 属性中配置 WebAgent 代理服务地址即可，例如：`http://localhost:3000/api/v1/webmcp/`。

```vue
<template>
  <TinyRemoter v-model:show="show" title="我的AI助手" agentRoot="http://localhost:3000/api/v1/webmcp/" />
</template>
```

## 三、私有化部署遥控网站

遥控网站需克隆官方仓库：https://github.com/opentiny/webmcp-sdk，然后进行本地部署。

网站源码位于 `packages/next-remoter` 目录。启动前需修改 `src/App.vue` 中的部分配置，例如 `agentRoot`、`llmConfigs`、`systemPrompt` 等属性，以及 `vite.config.ts` 中的 `server`、`build` 等配置。

```bash
cd packages/next-remoter

# 本地运行
pnpm dev

# 本地构建
pnpm build
```

启动后，遥控网站默认地址为 `http://localhost:8087/`。通过 URL 参数 `http://localhost:8087/?sessionId=xxxxx` 可连接受控网页。

## 四、完整示例

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    title="我的AI助手"
    AILogoUrl="https://xxxx.com/icon.png"
    sessionId="your-session-id"
    agentRoot="http://localhost:3000/api/v1/webmcp/"
    remoteUrl="http://localhost:8087/"
    qrCodeUrl="http://localhost:8087/"
    :menuItems="menuItems"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import '@opentiny/next-remoter/dist/style.css'

const show = ref(false)
const menuItems = ref([
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
    show: true,
    text: '远程遥控',
    icon: `<svg>...</svg>`
  },
  {
    action: 'remote-url',
    show: true,
    text: '远程URL',
    showCopyIcon: true // 显示复制图标
  }
])
</script>
```
