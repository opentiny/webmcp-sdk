import { SnapshotManager } from './snapshotManager'

/**
 * 快照管理器连接池
 * 用于管理多个标签页的连接，避免频繁连接和断开导致的页面抖动
 */
class SnapshotManagerPool {
  // 按 tabId 存储的 SnapshotManager 实例
  private managers = new Map<number, SnapshotManager>()
  // 记录每个 tabId 的连接引用计数
  private refCounts = new Map<number, number>()
  // 是否已初始化标签页关闭监听器
  private initialized = false

  /**
   * 初始化连接池，注册标签页关闭监听器
   */
  private init() {
    if (this.initialized) {
      return
    }

    // 监听标签页关闭事件，自动清理连接
    browser.tabs.onRemoved.addListener(async (tabId) => {
      if (this.managers.has(tabId)) {
        console.log(`标签页 ${tabId} 已关闭，自动清理连接池中的连接`)
        await this.disconnect(tabId)
      }
    })

    this.initialized = true
  }

  /**
   * 获取或创建指定标签页的 SnapshotManager 实例
   * @param tabId 标签页 ID
   * @returns SnapshotManager 实例
   */
  async getManager(tabId: number): Promise<SnapshotManager> {
    // 确保已初始化
    this.init()

    // 如果已存在连接，检查连接是否仍然有效
    if (this.managers.has(tabId)) {
      const manager = this.managers.get(tabId)!
      const page = manager.getPage()

      // 检查连接是否仍然有效（通过检查 page 对象是否存在）
      if (page) {
        // 连接有效，增加引用计数并返回
        const currentRefCount = this.refCounts.get(tabId) || 0
        this.refCounts.set(tabId, currentRefCount + 1)
        console.log(`[连接池] 标签页 ${tabId} 复用现有连接，引用计数: ${currentRefCount + 1}`)
        return manager
      } else {
        // 连接已断开，清理并重新创建
        console.warn(`[连接池] 标签页 ${tabId} 的连接已断开，重新创建连接`)
        this.managers.delete(tabId)
        this.refCounts.delete(tabId)
      }
    }

    // 创建新的连接
    // 注意：ExtensionTransport.connectTab 内部会附加调试器，这会导致调试器保持开启状态
    // 如果调试器已经被附加，ExtensionTransport.connectTab 可能会失败或导致调试器被分离
    // 因此，我们只在连接池中没有连接时才创建新连接
    console.log(`[连接池] 为标签页 ${tabId} 创建新连接`)
    const manager = new SnapshotManager()
    try {
      await manager.connect(tabId)
      this.managers.set(tabId, manager)
      this.refCounts.set(tabId, 1)
      console.log(`[连接池] 标签页 ${tabId} 连接成功`)
    } catch (error: any) {
      console.error(`[连接池] 标签页 ${tabId} 连接失败:`, error)
      throw error
    }

    return manager
  }

  /**
   * 释放指定标签页的 SnapshotManager 引用
   * 注意：为了减少页面抖动，连接会保持开启状态，不会自动断开
   * 只有当用户手动调用 disconnect() 时才会断开连接
   * @param tabId 标签页 ID
   * @param forceDisconnect 是否强制断开连接（忽略引用计数）
   */
  async releaseManager(tabId: number, forceDisconnect = false): Promise<void> {
    if (!this.managers.has(tabId)) {
      return
    }

    const currentRefCount = this.refCounts.get(tabId) || 0

    // 如果强制断开，则断开连接
    if (forceDisconnect) {
      const manager = this.managers.get(tabId)!
      await manager.disconnect()
      this.managers.delete(tabId)
      this.refCounts.delete(tabId)
    } else {
      // 否则只减少引用计数，但保持连接开启（避免页面抖动）
      // 连接会一直保持开启，直到用户手动调用 disconnect()
      if (currentRefCount > 0) {
        this.refCounts.set(tabId, currentRefCount - 1)
        console.log(`[连接池] 标签页 ${tabId} 释放引用，引用计数: ${currentRefCount - 1}，连接保持开启`)
      }
    }
  }

  /**
   * 检查指定标签页是否有活跃连接
   * @param tabId 标签页 ID
   * @returns 是否有活跃连接
   */
  hasConnection(tabId: number): boolean {
    return this.managers.has(tabId)
  }

  /**
   * 获取指定标签页的连接引用计数
   * @param tabId 标签页 ID
   * @returns 引用计数
   */
  getRefCount(tabId: number): number {
    return this.refCounts.get(tabId) || 0
  }

  /**
   * 断开指定标签页的连接（强制断开）
   * @param tabId 标签页 ID
   */
  async disconnect(tabId: number): Promise<void> {
    await this.releaseManager(tabId, true)
  }

  /**
   * 断开所有连接
   */
  async disconnectAll(): Promise<void> {
    const promises: Promise<void>[] = []
    for (const tabId of this.managers.keys()) {
      promises.push(this.disconnect(tabId))
    }
    await Promise.all(promises)
  }

  /**
   * 获取所有已连接的标签页 ID
   * @returns 标签页 ID 数组
   */
  getConnectedTabIds(): number[] {
    return Array.from(this.managers.keys())
  }
}

// 导出单例实例
export const snapshotManagerPool = new SnapshotManagerPool()
