<template>
  <div class="token-usage-wrap" :title="allTitle">
    <div v-for="(val, key) in values" :key="key" :class="key" :style="{ width: val[0] }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'

const props = defineProps({
  usage: {
    type: Object as PropType<{
      cachedInputTokens: number
      inputTokens: number
      reasoningTokens: number
      outputTokens: number
      totalTokens: number
    }>,
    default: ''
  }
})

const values = computed(() => {
  const { cachedInputTokens = 0, inputTokens = 0, reasoningTokens = 0, outputTokens = 0, totalTokens = 0 } = props.usage
  return {
    cachedInputTokens: [(cachedInputTokens / totalTokens) * 100 + '%', cachedInputTokens],
    inputTokens: [((inputTokens - cachedInputTokens) / totalTokens) * 100 + '%', inputTokens],
    reasoningTokens: [(reasoningTokens / totalTokens) * 100 + '%', reasoningTokens],
    outputTokens: [(outputTokens / totalTokens) * 100 + '%', outputTokens]
  }
})

const allTitle = computed(() => {
  return Object.keys(props.usage)
    .map((name) => `${name}: ${props.usage[name] || '-'}`)
    .join('\n')
})
</script>

<style scoped>
.token-usage-wrap {
  width: 120px;
  height: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  flex-direction: row;
  gap: 0;
  align-items: stretch;
}

.cachedInputTokens {
  background-color: #a0dcfd;
}
.inputTokens {
  background-color: #60b3fe;
}
.reasoningTokens {
  background-color: #ffc104;
}
.outputTokens {
  background-color: #0c70f3;
}
</style>
