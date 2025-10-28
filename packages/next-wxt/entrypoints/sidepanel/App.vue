<script lang="ts" setup>
import { TinyRemoter } from '@opentiny/next-remoter'
import { onMessage } from 'webext-bridge/popup'
import { useBrowserExtensions } from './useBrowserExtensions'

onMessage('mcp-server-register1', (message) => {
  console.log('mcp-server-register1', message)
  return {
    mes: 'success'
  }
})
</script>

<template>
  <div>
    <TinyRemoter
      mode="chat-dialog"
      :browserExtensions="useBrowserExtensions"
      show
      fullscreen
      title="OpenTiny NEXT Browser Extension"
    >
    </TinyRemoter>
  </div>
</template>

<style scoped></style>
