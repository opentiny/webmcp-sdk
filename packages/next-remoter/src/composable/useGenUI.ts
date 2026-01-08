/**
 * 生成式UI状态管理 Composable
 * GenUI state management composable
 */

import { ref, watch, type Ref } from 'vue'
import { storage, StorageKeys } from '../utils/storage-manager'

// 全局响应式状态：生成式UI启用状态
// 初始值在第一次调用 useGenUI 时设置
let isGenuiEnabled: Ref<boolean> | null = null

/**
 * 生成式UI管理 composable
 * 提供生成式UI启用状态管理功能
 * GenUI management composable
 * Provides GenUI enabled state management
 */
export default function useGenUI(defaultValue: boolean = false) {
  // 如果全局状态还未初始化，则初始化
  if (isGenuiEnabled === null) {
    // 获取初始值：优先从存储读取，失败则使用传入的默认值
    let initialValue = defaultValue
    try {
      const stored = storage.getItem<boolean>(StorageKeys.GENUI_ENABLED)
      if (stored !== null) {
        // 如果存储中有值，优先使用用户之前的选择
        initialValue = stored
      } else {
        // 如果存储中没有值，使用默认值并保存
        try {
          storage.setItem(StorageKeys.GENUI_ENABLED, defaultValue)
        } catch (error) {
          console.error('[useGenUI] Failed to save genui enabled to storage:', error)
        }
      }
    } catch (error) {
      console.warn('[useGenUI] Failed to parse stored genui enabled:', error)
    }

    // 初始化全局状态（明确指定类型为 boolean）
    isGenuiEnabled = ref(initialValue) as Ref<boolean>

    // 设置 watch 监听，自动同步到存储
    watch(isGenuiEnabled, (newValue) => {
      try {
        storage.setItem(StorageKeys.GENUI_ENABLED, newValue)
        console.log('[useGenUI] GenUI enabled changed to:', newValue)
      } catch (error) {
        console.error('[useGenUI] Failed to save genui enabled to storage:', error)
      }
    })
  }

  /**
   * 切换生成式UI状态
   * Toggle GenUI enabled state
   */
  const toggleGenUI = () => {
    if (!isGenuiEnabled) {
      throw new Error('[useGenUI] isGenuiEnabled is not initialized')
    }
    isGenuiEnabled.value = !isGenuiEnabled.value
  }

  /**
   * 设置生成式UI状态
   * Set GenUI enabled state
   */
  const setGenUIEnabled = (enabled: boolean) => {
    if (!isGenuiEnabled) {
      throw new Error('[useGenUI] isGenuiEnabled is not initialized')
    }
    isGenuiEnabled.value = enabled
  }

  // 确保返回正确的类型
  if (!isGenuiEnabled) {
    throw new Error('[useGenUI] isGenuiEnabled is not initialized')
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
