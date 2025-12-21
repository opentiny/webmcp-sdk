<template>
  <Button size="small" class="action-button" :active="activeCount > 0" rounded @click="$emit('click')">
    <IconPlugin class="icon" style="font-size: 16px" />
    <span class="button-text">扩展</span>
    <span v-if="activeCount > 0" class="active-count">{{ activeCount }}</span>
  </Button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconPlugin } from '@opentiny/tiny-robot-svgs'
import type { PluginInfo } from '@opentiny/tiny-robot'
import Button from './Button.vue'

const props = defineProps<{
  installedPlugins: PluginInfo[]
}>()

defineEmits<{
  click: []
}>()

// 计算已启用的插件数量
// Calculate the number of enabled plugins
const activeCount = computed(() => {
  return props.installedPlugins.filter((plugin) => plugin.enabled).length
})
</script>

<style lang="less" scoped>
.action-button {
  position: relative;
}

.icon {
  flex-shrink: 0;
}

.button-text {
  max-width: 120px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.active-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 9px;
  line-height: 12px;
  font-weight: 500;
  width: 12px;
  height: 12px;
  background: #1476ff;
  color: #fff;
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .action-button {
    border: none;
    padding: 6px;
    border-radius: 12px;
    background-color: var(--rc-bg-default-2, #f5f5f5);

    &[data-active='true'] {
      background-color: var(--tr-color-primary-light, #ebeeff);
    }

    .button-text {
      display: none;
    }
  }
}
</style>
