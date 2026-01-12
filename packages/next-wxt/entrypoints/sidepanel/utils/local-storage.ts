/**
 * 本地存储工具（使用 localStorage，同步操作）
 * Local storage utility (using localStorage, synchronous operations)
 * 用于简化存储逻辑，在初始化时可以直接获取值
 * Used to simplify storage logic, can get values directly during initialization
 */

import { type StorageKey } from './storage-keys'

/**
 * 获取存储值（同步）
 * Get storage value (synchronous)
 */
export function getStorageItem<T = any>(key: StorageKey): T | null {
  try {
    const item = localStorage.getItem(key)
    if (item === null) {
      return null
    }
    return JSON.parse(item) as T
  } catch (error) {
    console.warn(`[LocalStorage] Failed to get item "${key}":`, error)
    return null
  }
}

/**
 * 设置存储值（同步）
 * Set storage value (synchronous)
 */
export function setStorageItem<T = any>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`[LocalStorage] Failed to set item "${key}":`, error)
  }
}

/**
 * 删除存储值（同步）
 * Remove storage value (synchronous)
 */
export function removeStorageItem(key: StorageKey): void {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`[LocalStorage] Failed to remove item "${key}":`, error)
  }
}

/**
 * 清空所有存储（同步）
 * Clear all storage (synchronous)
 */
export function clearStorage(): void {
  try {
    localStorage.clear()
  } catch (error) {
    console.error('[LocalStorage] Failed to clear storage:', error)
  }
}
