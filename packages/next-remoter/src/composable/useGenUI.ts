/**
 * 生成式UI状态管理 Composable
 * GenUI state management composable
 * 注意：此 composable 不负责存储，只负责管理组件内部的 GenUI 状态
 * Note: This composable does not handle storage, only manages component internal GenUI state
 */

import { computed, type Ref } from 'vue'

/**
 * 生成式UI管理 composable
 * 提供生成式UI启用状态管理功能
 * GenUI management composable
 * Provides GenUI enabled state management
 * @param isGenuiEnabledRef 外部传入的 GenUI 启用状态（可选，用于外部控制）External GenUI enabled state (optional, for external control)
 * @param onGenUIChange GenUI 状态变化回调函数（可选，用于通知外部）GenUI state change callback (optional, for notifying external)
 */
export default function useGenUI(
  isGenuiEnabledRef?: Ref<boolean>,
  onGenUIChange?: (enabled: boolean) => void
) {
  // 如果外部传入了状态，使用外部的；否则使用内部状态（但这种情况应该避免）
  const isGenuiEnabled = isGenuiEnabledRef || computed(() => false)

  /**
   * 切换生成式UI状态
   * Toggle GenUI enabled state
   */
  const toggleGenUI = () => {
    if (isGenuiEnabledRef) {
      isGenuiEnabledRef.value = !isGenuiEnabledRef.value
      if (onGenUIChange) {
        onGenUIChange(isGenuiEnabledRef.value)
      }
    } else {
      console.warn('[useGenUI] isGenuiEnabledRef is not provided, cannot toggle')
    }
  }

  /**
   * 设置生成式UI状态
   * Set GenUI enabled state
   */
  const setGenUIEnabled = (enabled: boolean) => {
    if (isGenuiEnabledRef) {
      isGenuiEnabledRef.value = enabled
      if (onGenUIChange) {
        onGenUIChange(enabled)
      }
    } else {
      console.warn('[useGenUI] isGenuiEnabledRef is not provided, cannot set')
    }
  }

  return {
    /** 生成式UI启用状态（响应式）GenUI enabled state (reactive) */
    isGenuiEnabled,
    /** 切换生成式UI状态 Toggle GenUI enabled state */
    toggleGenUI,
    /** 设置生成式UI状态 Set GenUI enabled state */
    setGenUIEnabled
  }
}
