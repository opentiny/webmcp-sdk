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
   * 在浏览器扩展中使用 ExtensionTransport 时，避免使用 createCDPSession（可能会卡住）
   * 改用直接使用 Puppeteer 的内部方法或通过属性选择器查找元素
   * @param uid 节点 UID
   */
  async getElementHandleByUid(uid: string): Promise<ElementHandle | null> {
    const node = this.getNodeByUid(uid)

    debugger

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

    // 方法 1: 尝试使用 Puppeteer 的内部方法 _adoptBackendNodeId
    // 这是最直接的方法，在浏览器扩展中可能可用
    try {
      const frame = this.page.mainFrame()
      const context = (frame as any)._mainWorld || frame

      // 尝试直接访问 _adoptBackendNodeId
      if (typeof (context as any)._adoptBackendNodeId === 'function') {
        try {
          const handle = await (context as any)._adoptBackendNodeId(backendNodeId)
          if (handle) {
            return handle as ElementHandle
          }
        } catch (e) {
          console.warn('_adoptBackendNodeId 方法失败:', e)
        }
      }

      // 尝试通过 frame 的 CDP 客户端（不通过 createCDPSession）
      const cdpSession = (frame as any)._client
      if (cdpSession && typeof cdpSession.send === 'function') {
        try {
          // 使用 frame 的 CDP 客户端（这是已经存在的连接）
          await cdpSession.send('DOM.enable').catch(() => {
            // 如果已经启用，忽略错误
          })

          const describeResult = await cdpSession.send('DOM.describeNode', {
            backendNodeId: backendNodeId
          })

          if (describeResult?.node?.nodeId) {
            const nodeId = describeResult.node.nodeId
            const resolveResult = await cdpSession.send('DOM.resolveNode', {
              nodeId: nodeId
            })

            if (resolveResult?.object?.objectId) {
              // 如果无法直接通过 objectId 创建 ElementHandle
              // 使用属性选择器作为备用方案
              const attributes = describeResult.node.attributes || []
              const selector = this.buildSelectorFromAttributes(attributes, describeResult.node)

              if (selector) {
                const elementHandle = await this.page.$(selector)
                if (elementHandle) {
                  return elementHandle
                }
              }
            }
          }
        } catch (e) {
          console.warn('通过 frame CDP 客户端获取节点失败:', e)
        }
      }
    } catch (error: any) {
      console.warn('方法 1 失败:', error)
    }

    // 方法 2: 使用节点的属性信息构建选择器（备用方案）
    // 通过页面的 evaluate 方法在页面上下文中查找元素
    try {
      const role = typeof node.role === 'string' ? node.role : node.role?.value
      const name = typeof node.name === 'string' ? node.name : node.name?.value
      const value = typeof node.value === 'string' ? node.value : node.value?.value

      // 如果节点有名称，尝试通过文本内容查找
      if (name) {
        // 使用 evaluateHandle 查找包含文本的元素
        try {
          // 使用 evaluateHandle 在页面上下文中查找包含文本的元素
          const handle = await this.page.evaluateHandle(
            (searchText: string, searchRole?: string) => {
              // 查找包含指定文本的元素
              const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
                null
              )

              let node
              while ((node = walker.nextNode())) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes(searchText)) {
                  const parent = node.parentElement
                  if (parent) {
                    // 如果提供了 role，检查是否匹配
                    if (searchRole) {
                      const elementRole = parent.getAttribute('role') || parent.tagName.toLowerCase()
                      if (elementRole.toLowerCase().includes(searchRole.toLowerCase())) {
                        return parent
                      }
                    } else {
                      return parent
                    }
                  }
                }
              }
              return null
            },
            name,
            role
          )

          if (handle) {
            try {
              const isNull = await (handle as any).evaluate((el: Element | null) => el === null)
              if (!isNull) {
                return handle as ElementHandle
              }
            } catch (e) {
              // 如果 evaluate 失败，尝试直接返回
              console.warn('evaluate 失败，尝试直接返回 handle:', e)
              return handle as ElementHandle
            }
          }

          // 如果上述方法失败，尝试使用 querySelector 查找包含文本的元素
          // 注意：这可能不够精确，会找到第一个匹配的元素
          try {
            const elements = await this.page.$$(`*`)
            for (const element of elements) {
              const text = await element.evaluate((el: Element) => el.textContent || '')
              if (text.includes(name)) {
                // 检查 role 是否匹配（如果提供）
                if (role) {
                  const elementRole = await element.evaluate((el: Element) => {
                    return el.getAttribute('role') || el.tagName.toLowerCase()
                  })
                  if (elementRole.toLowerCase().includes(role.toLowerCase())) {
                    return element
                  }
                } else {
                  return element
                }
              }
            }
          } catch (e) {
            console.warn('通过文本内容查找元素失败:', e)
          }
        } catch (e) {
          console.warn('使用文本内容查找元素失败:', e)
        }
      }
    } catch (error: any) {
      console.warn('方法 2 失败:', error)
    }

    // 如果所有方法都失败，抛出错误
    throw new Error(
      `无法通过 UID 获取 ElementHandle。UID: ${uid}, backendNodeId: ${backendNodeId}。` +
        `在浏览器扩展中使用 ExtensionTransport 时，createCDPSession() 可能不可用。` +
        `请确保页面已完全加载，并且节点仍然存在于页面中。`
    )
  }

  /**
   * 从节点属性构建选择器
   * @param attributes 节点属性数组
   * @param nodeInfo 节点信息
   */
  private buildSelectorFromAttributes(attributes: any[], nodeInfo: any): string | null {
    if (!attributes || attributes.length === 0) {
      return null
    }

    // 优先使用 id
    for (let i = 0; i < attributes.length; i += 2) {
      if (attributes[i] === 'id') {
        return `#${attributes[i + 1]}`
      }
    }

    // 使用 data-testid 或其他 data 属性
    for (let i = 0; i < attributes.length; i += 2) {
      if (attributes[i]?.startsWith('data-')) {
        return `[${attributes[i]}="${attributes[i + 1]}"]`
      }
    }

    // 使用 class（取第一个 class）
    for (let i = 0; i < attributes.length; i += 2) {
      if (attributes[i] === 'class') {
        const classes = attributes[i + 1].split(' ').filter(Boolean)
        if (classes.length > 0) {
          return `.${classes[0]}`
        }
      }
    }

    // 如果都没有，使用标签名（不够精确）
    if (nodeInfo?.localName) {
      return nodeInfo.localName
    }

    return null
  }

  /**
   * 获取页面对象（用于直接操作）
   */
  getPage(): Page | null {
    return this.page
  }
}
