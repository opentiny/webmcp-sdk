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

:deep(.tr-bubble__content-items) {
  p {
    font-size: 16px;
  }

  li {
    font-size: 14px;
    color: #555;
  }

  .tr-bubble__text {
    font-size: 16px;
  }
}
</style>
