// 快照管理器
// 参考 chrome-devtools-mcp 的技术方案
// 负责管理快照生成、UID 分配、节点映射

import { connect, ExtensionTransport } from 'puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js'
import type { Page, ElementHandle } from 'puppeteer-core'

/**
 * 无障碍树节点类型（SerializedAXNode）
 * 与 chrome-devtools-mcp 保持一致
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
 * 参考 chrome-devtools-mcp 的 TextSnapshotNode
 */
export interface SnapshotNode extends SerializedAXNode {
  id: string // UID，格式：${snapshotId}_${idCounter}
  children: SnapshotNode[]
  backendNodeId?: number
}

/**
 * 快照数据结构
 * 参考 chrome-devtools-mcp 的 TextSnapshot
 */
export interface Snapshot {
  root: SnapshotNode
  snapshotId: string
  idToNode: Map<string, SnapshotNode>
  verbose: boolean
}

/**
 * 快照管理器
 * 参考 chrome-devtools-mcp 的 McpContext
 */
export class SnapshotManager {
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
      const transport = await ExtensionTransport.connectTab(tabId)
      this.browser = await connect({ transport })

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
   * 参考 chrome-devtools-mcp 的 createTextSnapshot
   * @param verbose 是否包含所有节点（false 时只包含重要节点）
   */
  async createTextSnapshot(verbose = false): Promise<Snapshot> {
    if (!this.page) {
      throw new Error('页面未连接，请先调用 connect()')
    }

    // 使用 Puppeteer 的 accessibility API 获取无障碍树
    // 参考 chrome-devtools-mcp: page.accessibility.snapshot()
    const rootNode = await this.page.accessibility.snapshot({
      includeIframes: true,
      interestingOnly: !verbose
    })

    if (!rootNode) {
      throw new Error('无障碍树快照返回 null')
    }

    // 分配快照 ID
    const snapshotId = String(this.nextSnapshotId++)

    // 遍历树并分配 UID
    // 参考 chrome-devtools-mcp 的 assignIds
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
      // 参考 chrome-devtools-mcp 的逻辑
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
   * 参考 chrome-devtools-mcp 的 getElementByUid
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
   * 参考 chrome-devtools-mcp 的 getElementByUid -> node.elementHandle()
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

    // 通过 backendNodeId 获取 ElementHandle
    // 参考 chrome-devtools-mcp 和 puppeteerAXOperations
    try {
      const client = await this.page.createCDPSession()
      await client.send('DOM.enable')

      // 使用 DOM.describeNode 通过 backendNodeId 获取节点信息
      const describeResult = await client.send('DOM.describeNode', {
        backendNodeId: backendNodeId
      })

      if (!describeResult?.node?.nodeId) {
        throw new Error(`无法通过 backendNodeId 获取节点信息: ${backendNodeId}`)
      }

      const nodeId = describeResult.node.nodeId

      // 使用 DOM.resolveNode 通过 nodeId 获取 objectId
      const resolveResult = await client.send('DOM.resolveNode', {
        nodeId: nodeId
      })

      if (!resolveResult?.object?.objectId) {
        throw new Error(`无法通过 nodeId 获取 objectId: ${nodeId}`)
      }

      const objectId = resolveResult.object.objectId

      // 尝试使用 Puppeteer 的内部方法 _adoptBackendNodeId
      const frame = this.page.mainFrame()
      const context = (frame as any)._mainWorld || frame

      if (typeof (context as any)._adoptBackendNodeId === 'function') {
        try {
          const handle = await (context as any)._adoptBackendNodeId(backendNodeId)
          if (handle) {
            return handle as ElementHandle
          }
        } catch (e) {
          console.warn('_adoptBackendNodeId 方法失败，尝试备用方法:', e)
        }
      }

      // 备用方法：通过 evaluateHandle 和 objectId 创建 ElementHandle
      // 这是 Puppeteer 内部的创建方式
      try {
        const executionContext = frame.executionContext()
        const handle = await executionContext.evaluateHandle((objId) => {
          // 这里无法直接访问 objectId，需要其他方式
          return null
        }, objectId)

        // 如果上述方法失败，尝试使用节点的属性构建选择器
        // 这是一个备用方案，可能不够精确
        const attributes = describeResult.node.attributes || []
        let selector = ''

        // 优先使用 id
        for (let i = 0; i < attributes.length; i += 2) {
          if (attributes[i] === 'id') {
            selector = `#${attributes[i + 1]}`
            break
          }
        }

        // 如果没有 id，使用 data-testid
        if (!selector) {
          for (let i = 0; i < attributes.length; i += 2) {
            if (attributes[i]?.startsWith('data-')) {
              selector = `[${attributes[i]}="${attributes[i + 1]}"]`
              break
            }
          }
        }

        if (selector) {
          const handle = await this.page.$(selector)
          if (handle) {
            return handle
          }
        }

        // 最后的手段：使用标签名和索引
        if (describeResult.node.localName) {
          const parentId = describeResult.node.parentId
          if (parentId) {
            const parentInfo = await client.send('DOM.describeNode', {
              nodeId: parentId,
              depth: 1
            })

            if (parentInfo?.node?.children) {
              const index = parentInfo.node.children.findIndex((child: any) => child.nodeId === nodeId)
              if (index >= 0) {
                selector = `${describeResult.node.localName}:nth-of-type(${index + 1})`
                const handle = await this.page.$(selector)
                if (handle) {
                  return handle
                }
              }
            }
          }
        }

        throw new Error('无法通过任何方式获取 ElementHandle')
      } catch (e) {
        throw new Error(`获取 ElementHandle 失败: ${e}`)
      }
    } catch (error: any) {
      throw new Error(`通过 UID 获取 ElementHandle 失败: ${error.message}`)
    }
  }

  /**
   * 获取页面对象（用于直接操作）
   */
  getPage(): Page | null {
    return this.page
  }
}
