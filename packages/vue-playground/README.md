# Chat UI 的演练场

演示`"@opentiny/next-remoter"` 库导出的 `useNextAgent` 如何适配在其它UI上。目前已适配 'matechat' | 'antx' | 'elementplusx' | 'tdchat' 等Chat UI库。

## 运行

克隆仓库后，执行以下命令启动 `Chat UI 的演练场`

```bash
pnpm install
pnpm dev:vue-playground
```

## 如何切换示例

打开 `src/App.vue` 文件，通过放开注释，查看相应的示例：

```vue
<template>
  <!-- <MetachatRemoter /> -->
  <!-- <antdXVueRemoter /> -->
  <!-- <elPlusXRemoter /> -->
  <tdChatRemoter />
</template>

<script setup lang="ts">
// import MetachatRemoter from './matechat/matechat-remoter.vue'
// import antdXVueRemoter from './antd-x-vue/antd-x-vue-remoter.vue'
// import elPlusXRemoter from './el-plus-x/el-plus-x-remoter.vue'
import tdChatRemoter from './td-chat/td-chat-remoter.vue'
</script>
```
