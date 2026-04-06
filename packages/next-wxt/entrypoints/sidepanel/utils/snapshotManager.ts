import { connect, ExtensionTransport } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js'
import type { Page, ElementHandle } from 'puppeteer-core'
import { delay } from './utils'
import { highlightNodeByUid } from './snapshotOperations'

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
      // 使用 ExtensionTransport 连接到标签页
      // 注意：ExtensionTransport.connectTab 内部会附加调试器
      // 如果调试器已经被附加，可能会失败，但 Puppeteer 会处理这种情况
      const transport = await ExtensionTransport.connectTab(tabId)
      // 设置 defaultViewport 为 null，保持页面的原始尺寸，不改变页面大小
      this.browser = await connect({ transport, defaultViewport: null })

      const pages = await this.browser.pages()
      this.page = pages && pages.length > 0 ? pages[0] : null

      if (!this.page) {
        throw new Error('无法获取页面对象')
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
  /**
   * 滚动页面
   */
  async scrollPage() {
    if (!this.page) {
      throw new Error('页面未连接，请先调用 connect()')
    }

    for (let index = 0; index < 10; index++) {
      await this.page.keyboard.press('PageDown')
      await delay(20)
    }

    return true
  }

  /**
   * 高亮页面可点击的项
   * @param isHighlight 是否高亮
   */
  async highlightPage(isHighlight: boolean) {
    if (!this.currentSnapshot) {
      await this.createTextSnapshot()
    }

    for (const [id, node] of this.currentSnapshot.idToNode.entries()) {
      if (node.backendDOMNodeId || node.backendNodeId) {
        await highlightNodeByUid(this, node.id, isHighlight)
      }
    }
  }
}
