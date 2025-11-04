<script lang="ts" setup>
import { TinyRemoter } from '@opentiny/next-remoter'
import { useBrowserExtensions } from './useBrowserExtensions'

const llmConfig = {
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseURL: import.meta.env.VITE_LLM_BASE_URL,
  providerType: import.meta.env.VITE_LLM_PROVIDER_TYPE,
  model: import.meta.env.VITE_LLM_MODEL
}
</script>

<template>
  <div>
    <TinyRemoter
      mode="chat-dialog"
      :browserExtensions="useBrowserExtensions"
      show
      fullscreen
      title=""
      :llmConfig="llmConfig"
    >
    </TinyRemoter>
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
