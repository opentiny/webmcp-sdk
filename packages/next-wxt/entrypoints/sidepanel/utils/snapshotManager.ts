import { connect, ExtensionTransport } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js'
import type { Page, ElementHandle } from 'puppeteer-core'

/**
 * 无障碍树节点类型（SerializedAXNode）
 */
export interface SerializedAXNode {
  role?: { value?: string } | string
  name?: { value?: string } | string | { type?: string; value?: string }
  value?: { value?: string } | string
  backendNodeId?: number // CDP 协议中的 DOM 节点 ID
  backendDOMNodeId?: number // 备用属性名
  children?: SerializedAXNode[]
  childIds?: (string | number)[]
  description?: string | { value?: string }
  [key: string]: any
}

/**
 * 带 UID 的快照节点
 */
export interface SnapshotNode extends SerializedAXNode {
  id: string // UID，格式：${snapshotId}_${idCounter}
  children: SnapshotNode[]
  backendNodeId?: number
}

/**
 * 快照数据结构
 */
export interface Snapshot {
  root: SnapshotNode
  snapshotId: string
  idToNode: Map<string, SnapshotNode>
  verbose: boolean
}

/**
 * 快照管理器
 */
export class SnapshotManager {
  // 当前快照id
  private nextSnapshotId = 1
  private currentSnapshot: Snapshot | null = null
  private page: Page | null = null
  private browser: any = null

  /**
   * 连接到标签页
   * @param tabId 标签页 ID
   */
  async connect(tabId: number): Promise<void> {
    try {
      // 在连接前，先获取当前标签页的窗口大小，以便保持原有大小
      let originalViewport: { width?: number; height?: number } | null = null
      try {
        const tab = await browser.tabs.get(tabId)
        if (tab.width && tab.height) {
          originalViewport = { width: tab.width, height: tab.height }
        }
      } catch (e) {
        // 如果获取失败，忽略错误
        console.warn('无法获取标签页大小:', e)
      }

      // 使用 ExtensionTransport 连接到标签页
      const transport = await ExtensionTransport.connectTab(tabId)
      this.browser = await connect({ transport })

      const pages = await this.browser.pages()
      this.page = pages && pages.length > 0 ? pages[0] : null

      if (!this.page) {
        throw new Error('无法获取页面对象')
      }

      // 如果获取到了原始视口大小，保持原有大小
      // 注意：在浏览器扩展中使用 ExtensionTransport 时，可能无法直接设置视口
      // 但我们可以尝试通过 CDP 命令来保持视口大小
      if (originalViewport?.width && originalViewport?.height) {
        try {
          // 尝试设置视口大小（如果 Puppeteer 支持）
          await this.page
            .setViewport({
              width: originalViewport.width,
              height: originalViewport.height,
              deviceScaleFactor: 1
            })
            .catch((e) => {
              // 如果设置失败（在 ExtensionTransport 中可能不支持），尝试使用 CDP
              console.warn('设置视口大小失败，尝试使用 CDP:', e)
            })

          // 备用方案：如果 setViewport 不可用，尝试通过 CDP 设置
          // 注意：这可能在 ExtensionTransport 中不可用
          try {
            const frame = this.page.mainFrame()
            const cdpSession = (frame as any)._client
            if (cdpSession && typeof cdpSession.send === 'function') {
              await cdpSession
                .send('Emulation.setDeviceMetricsOverride', {
                  width: originalViewport.width,
                  height: originalViewport.height,
                  deviceScaleFactor: 1,
                  mobile: false
                })
                .catch(() => {
                  // 忽略错误，保持原有大小可能不可用
                })
            }
          } catch (e) {
            // 忽略错误
            console.warn('通过 CDP 设置视口大小失败:', e)
          }
        } catch (e) {
          console.warn('保持视口大小失败:', e)
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error)
      throw new Error(`连接失败: ${errorMessage}`)
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.browser) {
      await this.browser.disconnect()
      this.browser = null
      this.page = null
    }
    this.currentSnapshot = null
  }

  /**
   * 获取当前快照
   */
  getSnapshot(): Snapshot | null {
    return this.currentSnapshot
  }

  /**
   * 创建文本快照
   * @param verbose 是否包含所有节点（false 时只包含重要节点）
   */
  async createTextSnapshot(verbose = false): Promise<Snapshot> {
    if (!this.page) {
      throw new Error('页面未连接，请先调用 connect()')
    }

    // 使用 Puppeteer 的 accessibility API 获取无障碍树
    const rootNode = await this.page.accessibility.snapshot({
      includeIframes: true,
      // 是否只包含重要节点
      interestingOnly: !verbose
    })

    if (!rootNode) {
      throw new Error('无障碍树快照返回 null')
    }

    // 分配快照 ID
    const snapshotId = String(this.nextSnapshotId++)

    // 遍历树并分配 UID
    let idCounter = 0
    const idToNode = new Map<string, SnapshotNode>()

    const assignIds = (node: SerializedAXNode): SnapshotNode => {
      const uid = `${snapshotId}_${idCounter++}`
      const nodeWithId: SnapshotNode = {
        ...node,
        id: uid,
        children: node.children ? node.children.map((child) => assignIds(child)) : [],
        // 确保 backendNodeId 存在
        backendNodeId: node.backendNodeId ?? node.backendDOMNodeId
      }

      // 处理 option 节点：如果 name 存在但没有 value，将 name 作为 value
      if (
        nodeWithId.role === 'option' ||
        (typeof nodeWithId.role === 'object' && nodeWithId.role?.value === 'option')
      ) {
        const name = typeof nodeWithId.name === 'string' ? nodeWithId.name : nodeWithId.name?.value
        if (name && !nodeWithId.value) {
          nodeWithId.value = name
        }
      }

      // 存储到映射表
      idToNode.set(uid, nodeWithId)

      return nodeWithId
    }

    const rootNodeWithId = assignIds(rootNode as SerializedAXNode)

    // 创建快照对象
    const snapshot: Snapshot = {
      root: rootNodeWithId,
      snapshotId,
      idToNode,
      verbose
    }

    // 更新当前快照
    this.currentSnapshot = snapshot

    return snapshot
  }

  /**
   * 通过 UID 获取节点
   * @param uid 节点 UID
   */
  getNodeByUid(uid: string): SnapshotNode | null {
    if (!this.currentSnapshot) {
      return null
    }

    // 验证快照 ID 是否匹配
    const [snapshotId] = uid.split('_')
    if (this.currentSnapshot.snapshotId !== snapshotId) {
      return null
    }

    return this.currentSnapshot.idToNode.get(uid) || null
  }

  /**
   * 通过 UID 获取 ElementHandle
   * @param uid 节点 UID
   */
  async getElementHandleByUid(uid: string): Promise<ElementHandle | null> {
    const node = this.getNodeByUid(uid)

    if (!node) {
      throw new Error(`快照中未找到节点 UID: ${uid}。请先获取新的快照。`)
    }

    const backendNodeId = node.backendNodeId ?? node.backendDOMNodeId

    if (!backendNodeId) {
      throw new Error(`节点没有 backendNodeId，无法获取 ElementHandle。UID: ${uid}`)
    }

    if (!this.page) {
      throw new Error('页面未连接')
    }

    if (node.elementHandle) {
      return node.elementHandle()
    }

    throw new Error(`无法通过 UID 获取 ElementHandle。UID: ${uid}, backendNodeId: ${backendNodeId}。`)
  }

  /**
   * 获取页面对象（用于直接操作）
   */
  getPage(): Page | null {
    return this.page
  }
}
