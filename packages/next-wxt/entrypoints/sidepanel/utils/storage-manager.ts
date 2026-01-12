/**
 * 浏览器扩展存储管理模块
 * 使用 browser.storage.local API 进行持久化存储
 * Browser extension storage management module
 * Uses browser.storage.local API for persistent storage
 */

import { browser } from 'wxt/browser'
import { StorageKeys, type StorageKey } from './storage-keys'

/**
 * 存储管理器
 * 提供类型安全的存储操作接口，使用浏览器扩展的 storage API
 * Storage manager
 * Provides type-safe storage operation interface using browser extension storage API
 */
class StorageManager {
  /**
   * 获取存储值
   * Get storage value
   */
  async getItem<T = any>(key: StorageKey): Promise<T | null> {
    try {
      const result = await browser.storage.local.get(key)
      const value = result[key]
      if (value === undefined) {
        return null
      }
      return value as T
    } catch (error) {
      console.warn(`[StorageManager] Failed to get item "${key}":`, error)
      return null
    }
  }

  /**
   * 同步获取存储值（兼容同步接口）
   * Get storage value synchronously (for compatibility)
   * 注意：浏览器扩展的 storage API 是异步的，此方法会返回 null 并记录警告
   * Note: Browser extension storage API is async, this method returns null and logs a warning
   */
  getItemSync<T = any>(key: StorageKey): T | null {
    console.warn(`[StorageManager] getItemSync called for key "${key}". Browser storage is async, use getItem instead.`)
    return null
  }

  /**
   * 设置存储值
   * Set storage value
   */
  async setItem<T = any>(key: StorageKey, value: T): Promise<void> {
    try {
      await browser.storage.local.set({ [key]: value })
    } catch (error) {
      console.error(`[StorageManager] Failed to set item "${key}":`, error)
      throw error
    }
  }

  /**
   * 同步设置存储值（兼容同步接口）
   * Set storage value synchronously (for compatibility)
   * 注意：浏览器扩展的 storage API 是异步的，此方法会异步执行但不等待完成
   * Note: Browser extension storage API is async, this method executes async but doesn't wait
   */
  setItemSync<T = any>(key: StorageKey, value: T): void {
    this.setItem(key, value).catch((error) => {
      console.error(`[StorageManager] Failed to set item "${key}" (async):`, error)
    })
  }

  /**
   * 删除存储值
   * Remove storage value
   */
  async removeItem(key: StorageKey): Promise<void> {
    try {
      await browser.storage.local.remove(key)
    } catch (error) {
      console.error(`[StorageManager] Failed to remove item "${key}":`, error)
      throw error
    }
  }

  /**
   * 清空所有存储
   * Clear all storage
   */
  async clear(): Promise<void> {
    try {
      await browser.storage.local.clear()
    } catch (error) {
      console.error(`[StorageManager] Failed to clear storage:`, error)
      throw error
    }
  }
}

// 创建默认实例
// Create default instance
const storageManager = new StorageManager()

/**
 * 存储接口（兼容同步和异步调用）
 * Storage interface (compatible with sync and async calls)
 */
export const storage = {
  /**
   * 获取存储值（同步接口，返回 null，实际应使用异步版本）
   * Get storage value (sync interface, returns null, should use async version)
   */
  getItem: <T = any>(key: StorageKey): T | null => {
    return storageManager.getItemSync<T>(key)
  },

  /**
   * 异步获取存储值
   * Get storage value asynchronously
   */
  getItemAsync: <T = any>(key: StorageKey): Promise<T | null> => {
    return storageManager.getItem<T>(key)
  },

  /**
   * 设置存储值（同步接口，实际异步执行）
   * Set storage value (sync interface, actually executes async)
   */
  setItem: <T = any>(key: StorageKey, value: T): void => {
    storageManager.setItemSync(key, value)
  },

  /**
   * 异步设置存储值
   * Set storage value asynchronously
   */
  setItemAsync: <T = any>(key: StorageKey, value: T): Promise<void> => {
    return storageManager.setItem(key, value)
  },

  /**
   * 删除存储值
   * Remove storage value
   */
  removeItem: (key: StorageKey): void => {
    storageManager.removeItem(key).catch((error) => {
      console.error(`[StorageManager] Failed to remove item "${key}":`, error)
    })
  },

  /**
   * 清空所有存储
   * Clear all storage
   */
  clear: (): void => {
    storageManager.clear().catch((error) => {
      console.error(`[StorageManager] Failed to clear storage:`, error)
    })
  }
}

// 导出存储键常量
// Export storage key constants
export { StorageKeys, type StorageKey }
