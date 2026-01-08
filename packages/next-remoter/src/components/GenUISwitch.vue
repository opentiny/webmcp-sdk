<template>
  <Button class="action-button" :active="isGenuiEnabled" rounded size="small" @click="toggleGenUI">
    <IconVisual :width="16" :height="16" />
    <span class="button-text">生成式UI</span>
  </Button>
</template>

<script setup lang="ts">
import useGenUI from '../composable/useGenUI'
import Button from './Button.vue'
import IconVisual from './icons/icon-visual.svg'

// 使用生成式UI状态管理
const { isGenuiEnabled, toggleGenUI } = useGenUI()
</script>

<style lang="less" scoped>
.action-button {
  position: relative;
  .button-text {
    max-width: 120px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
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
