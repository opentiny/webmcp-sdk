<script setup lang="ts">
withDefaults(
  defineProps<{
    active?: boolean
    rounded?: boolean
    size?: 'small' | 'medium'
    disabled?: boolean
  }>(),
  {
    size: 'medium',
  },
)
</script>

<template>
  <button
    class="button"
    :class="{ rounded, [size]: true }"
    :data-active="active || undefined"
    :disabled="disabled || undefined"
  >
    <slot></slot>
  </button>
</template>

<style scoped lang="less">
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--rc-text-primary, #333);
  border: 1px solid var(--rc-border-default, #e0e0e0);
  border-radius: 8px;
  cursor: pointer;
  padding: 6px 16px;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
  background-color: transparent;

  & > :deep(svg) {
    color: var(--rc-icon-color, #666);
  }

  &:hover:not(:disabled) {
    background-color: var(--rc-btn-bg-primary-hover, #f5f5f5);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &[data-active='true'] {
    border-color: var(--tr-color-primary, #1476ff);
    color: var(--tr-color-primary, #1476ff);
    & > :deep(svg) {
      color: var(--tr-color-primary, #1476ff);
    }
  }

  &.rounded {
    border-radius: 9999px;
  }

  &.small {
    padding: 4px 12px;
    font-size: 12px;
  }

  &.medium {
    padding: 6px 16px;
  }
}
</style>

