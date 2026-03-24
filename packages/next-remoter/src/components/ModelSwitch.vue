<template>
  <div class="model-switch-wrapper" ref="wrapperRef">
    <Button size="small" class="action-button" rounded @click="toggleDropdown">
      <component :is="selectedModel?.icon" :width="16" :height="16" class="selected-model__icon" />
      <span class="button-text">{{ selectedModel?.label }}</span>
      <IconModel :width="16" :height="16" />
    </Button>

    <!-- 下拉菜单 -->
    <transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu" ref="dropdownMenuRef">
        <!-- 菜单项 -->
        <div class="dropdown-menu__items">
          <template v-for="item in availableModels" :key="item.id">
            <!-- 菜单项 -->
            <div
              class="dropdown-menu__item"
              :class="{ 'active-menu': item.id === selectedModelId }"
              @click.stop="handleChangeModel(item.id)"
            >
              <component v-if="item.icon" :is="item.icon" :width="16" :height="16" class="dropdown-menu__icon" />
              <span>{{ item.label }}</span>
            </div>
          </template>
        </div>
      </div>
    </transition>

    <!-- 遮罩层 -->
    <div v-if="isOpen" class="dropdown-overlay" @click="closeDropdown"></div>
  </div>
</template>

<script setup lang="ts">
import useModel from '../composable/useModel'
import { onClickOutside } from '@vueuse/core'
import { ref, computed, type Ref } from 'vue'
import Button from './Button.vue'
import IconModel from './icons/icon-model.svg'
import type { UnifiedModelConfig } from '../types/model-config'

const props = defineProps<{
  /** 模型配置列表 Model configuration list */
  modelConfigs?: Ref<UnifiedModelConfig[]> | UnifiedModelConfig[]
}>()

// 使用 defineModel 定义 selectedModelId，实现双向绑定（简化逻辑）
const selectedModelId = defineModel<string>('selectedModelId', { type: String, default: undefined, required: false })

// 处理 modelConfigs：使用 computed 保持对 props 的响应式追踪
const modelConfigsRef = computed(() => {
  const configs = props.modelConfigs
  if (!configs) return []
  return Array.isArray(configs) ? configs : (configs as Ref<UnifiedModelConfig[]>).value
})

// 使用 defineModel 返回的 ref 直接传递给 useModel，defineModel 会自动处理双向绑定
// 注意：当使用 defineModel 时，不需要在 onModelChange 回调中更新 selectedModelId，
// 因为 useModel 内部已经直接使用传入的 ref，避免了循环更新
const { selectedModel, availableModels, setSelectedModel } = useModel(modelConfigsRef, selectedModelId)

const isOpen = ref(false)

const handleChangeModel = (modelId: string) => {
  setSelectedModel(modelId)
  closeDropdown()
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}
const closeDropdown = () => {
  isOpen.value = false
}

const wrapperRef = ref<HTMLElement | null>(null)
const dropdownMenuRef = ref<HTMLElement | null>(null)

onClickOutside(
  dropdownMenuRef,
  () => {
    closeDropdown()
  },
  {
    ignore: [wrapperRef]
  }
)
</script>

<style lang="less" scoped>
.model-switch-wrapper {
  position: relative;
  display: inline-block;
}

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
.dropdown-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 5px;
  min-width: 218px;
  background: var(--rc-bg-default-4, white);
  border-radius: 12px;
  box-shadow: 0 2px 28px 0 rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;

  &__items {
    padding: 4px 0 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    width: 100%;
    padding: 8px 16px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    line-height: 20px;
    font-weight: 400;
    text-align: left;
    color: var(--rc-text-primary, #333);
    transition: background-color 0.2s;

    &:hover {
      background: var(--rc-bg-default-2, #f5f5f5);
    }
  }
  .active-menu {
    background: var(--rc-bg-default-2, #f5f5f5);
  }

  &__icon {
    padding: 4px 0;
    width: 16px;
    height: 16px;
    box-sizing: content-box;
    color: var(--rc-icon-color-secondary, #999);
  }
}

.dropdown-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: transparent;
}

.selected-model__icon {
  flex-shrink: 0;
}
</style>
