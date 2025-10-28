<script lang="ts" setup>
import { TinyRemoter } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './useBrowserExtensions'
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
