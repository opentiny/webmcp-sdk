<script lang="ts" setup>
import { TinyRemoter } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './useBrowserExtensions'
</script>

<template>
  <div>
    <TinyRemoter mode="chat-dialog" :browserExtensions="useBrowserExtensions" show fullscreen title=""> </TinyRemoter>
  </div>
</template>

<style scoped>
:deep(.tr-container__header-operations) {
  .tr-icon-button {
    display: none;
  }

  .tr-icon-button:first-child,
  .tr-icon-button:nth-child(2) {
    display: flex;
  }
}
</style>
