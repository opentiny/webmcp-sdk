/**
 * 统一存储管理模块
 * 提供统一的存储接口，默认使用本地存储（localStorage）
 * 支持通过自定义适配器对接后台服务
 * Unified storage management module
 * Provides unified storage interface, defaults to local storage (localStorage)
 * Supports backend integration through custom adapters
 */

import { StorageKeys, type StorageKey } from './storage-keys'

/**
 * 存储适配器接口
 * 定义存储操作的统一接口，可以轻松切换实现（localStorage、API等）
 * Storage adapter interface
 * Defines unified interface for storage operations, can easily switch implementations (localStorage, API, etc.)
 */
export interface IStorageAdapter {
  /**
   * 获取存储值
   * Get storage value
   */
  getItem<T = any>(key: string): Promise<T | null> | T | null

  /**
   * 设置存储值
   * Set storage value
   */
  setItem<T = any>(key: string, value: T): Promise<void> | void

  /**
   * 删除存储值
   * Remove storage value
   */
  removeItem(key: string): Promise<void> | void

  /**
   * 清空所有存储
   * Clear all storage
   */
  clear(): Promise<void> | void
}

/**
 * 本地存储适配器（localStorage）
 * Local storage adapter (localStorage)
 */
class LocalStorageAdapter implements IStorageAdapter {
  getItem<T = any>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      if (item === null) {
        return null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.warn(`[StorageManager] Failed to get item "${key}":`, error)
      return null
    }
  }

  setItem<T = any>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`[StorageManager] Failed to set item "${key}":`, error)
      throw error
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`[StorageManager] Failed to remove item "${key}":`, error)
      throw error
    }
  }

  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error(`[StorageManager] Failed to clear storage:`, error)
      throw error
    }
  }
}

/**
 * 存储管理器配置
 * Storage manager configuration
 */
export interface StorageManagerConfig {
  /**
   * 存储适配器
   * 默认使用 LocalStorageAdapter
   * 可以通过自定义适配器对接后台服务
   * Storage adapter
   * Defaults to LocalStorageAdapter
   * Can use custom adapter to integrate with backend services
   */
  adapter?: IStorageAdapter
}

/**
 * 统一存储管理器
 * 提供类型安全的存储操作接口
 * Unified storage manager
 * Provides type-safe storage operation interface
 */
export class StorageManager {
  private adapter: IStorageAdapter

  constructor(config: StorageManagerConfig = {}) {
    if (config.adapter) {
      // 使用自定义适配器（可用于对接后台服务）
      this.adapter = config.adapter
    } else {
      // 默认使用本地存储适配器
      this.adapter = new LocalStorageAdapter()
    }
  }

  /**
   * 获取存储值
   * Get storage value
   */
  getItem<T = any>(key: StorageKey): T | null {
    const result = this.adapter.getItem<T>(key)
    // 如果返回 Promise，需要处理异步情况
    if (result instanceof Promise) {
      console.warn(`[StorageManager] Async storage adapter detected, but sync method called for key: ${key}`)
      return null
    }
    return result
  }

  /**
   * 异步获取存储值
   * Get storage value asynchronously
   */
  async getItemAsync<T = any>(key: StorageKey): Promise<T | null> {
    const result = this.adapter.getItem<T>(key)
    if (result instanceof Promise) {
      return result
    }
    return Promise.resolve(result)
  }

  /**
   * 设置存储值
   * Set storage value
   */
  setItem<T = any>(key: StorageKey, value: T): void {
    const result = this.adapter.setItem(key, value)
    // 如果返回 Promise，需要处理异步情况
    if (result instanceof Promise) {
      result.catch((error) => {
        console.error(`[StorageManager] Failed to set item "${key}":`, error)
      })
    }
  }

  /**
   * 异步设置存储值
   * Set storage value asynchronously
   */
  async setItemAsync<T = any>(key: StorageKey, value: T): Promise<void> {
    const result = this.adapter.setItem(key, value)
    if (result instanceof Promise) {
      return result
    }
    return Promise.resolve()
  }

  /**
   * 删除存储值
   * Remove storage value
   */
  removeItem(key: StorageKey): void {
    const result = this.adapter.removeItem(key)
    if (result instanceof Promise) {
      result.catch((error) => {
        console.error(`[StorageManager] Failed to remove item "${key}":`, error)
      })
    }
  }

  /**
   * 异步删除存储值
   * Remove storage value asynchronously
   */
  async removeItemAsync(key: StorageKey): Promise<void> {
    const result = this.adapter.removeItem(key)
    if (result instanceof Promise) {
      return result
    }
    return Promise.resolve()
  }

  /**
   * 清空所有存储
   * Clear all storage
   */
  clear(): void {
    const result = this.adapter.clear()
    if (result instanceof Promise) {
      result.catch((error) => {
        console.error(`[StorageManager] Failed to clear storage:`, error)
      })
    }
  }

  /**
   * 异步清空所有存储
   * Clear all storage asynchronously
   */
  async clearAsync(): Promise<void> {
    const result = this.adapter.clear()
    if (result instanceof Promise) {
      return result
    }
    return Promise.resolve()
  }

  /**
   * 切换存储适配器
   * Switch storage adapter
   */
  setAdapter(adapter: IStorageAdapter): void {
    this.adapter = adapter
  }
}

// 创建默认实例（使用本地存储）
// Create default instance (using local storage)
let defaultStorageManager: StorageManager | null = null

/**
 * 获取默认存储管理器实例
 * Get default storage manager instance
 */
export function getStorageManager(config?: StorageManagerConfig): StorageManager {
  if (!defaultStorageManager) {
    defaultStorageManager = new StorageManager(config)
  }
  return defaultStorageManager
}

/**
 * 创建新的存储管理器实例
 * Create a new storage manager instance
 */
export function createStorageManager(config?: StorageManagerConfig): StorageManager {
  return new StorageManager(config)
}

// 导出存储键常量
// Export storage key constants
export { StorageKeys }

// 导出默认实例的便捷方法
// Export convenience methods for default instance
export const storage = {
  /**
   * 获取存储值
   * Get storage value
   */
  getItem: <T = any>(key: StorageKey): T | null => {
    return getStorageManager().getItem<T>(key)
  },

  /**
   * 异步获取存储值
   * Get storage value asynchronously
   */
  getItemAsync: <T = any>(key: StorageKey): Promise<T | null> => {
    return getStorageManager().getItemAsync<T>(key)
  },

  /**
   * 设置存储值
   * Set storage value
   */
  setItem: <T = any>(key: StorageKey, value: T): void => {
    getStorageManager().setItem(key, value)
  },

  /**
   * 异步设置存储值
   * Set storage value asynchronously
   */
  setItemAsync: <T = any>(key: StorageKey, value: T): Promise<void> => {
    return getStorageManager().setItemAsync(key, value)
  },

  /**
   * 删除存储值
   * Remove storage value
   */
  removeItem: (key: StorageKey): void => {
    getStorageManager().removeItem(key)
  },

  /**
   * 异步删除存储值
   * Remove storage value asynchronously
   */
  removeItemAsync: (key: StorageKey): Promise<void> => {
    return getStorageManager().removeItemAsync(key)
  },

  /**
   * 清空所有存储
   * Clear all storage
   */
  clear: (): void => {
    getStorageManager().clear()
  },

  /**
   * 异步清空所有存储
   * Clear all storage asynchronously
   */
  clearAsync: (): Promise<void> => {
    return getStorageManager().clearAsync()
  }
}
