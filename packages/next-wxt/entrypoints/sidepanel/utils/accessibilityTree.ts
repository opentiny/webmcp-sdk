// 声明 chrome.debugger API 的类型（Chrome 扩展全局对象）
export declare const chrome: {
  debugger: {
    attach: (debuggee: { tabId: number }, requiredVersion: string, callback?: (error?: Error) => void) => void
    detach: (debuggee: { tabId: number }, callback?: () => void) => void
    sendCommand: (
      debuggee: { tabId: number },
      method: string,
      commandParams?: any,
      callback?: (result?: any, error?: Error) => void
    ) => void
  }
  runtime: {
    lastError?: { message?: string }
  }
}

export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 检查页面是否支持 debugger 附加
 * @param url 页面 URL
 * @returns 是否支持
 */
const isPageSupported = (url?: string): boolean => {
  if (!url) return false
  // 排除不支持 debugger 的页面类型
  const unsupportedProtocols = ['chrome:', 'chrome-extension:', 'moz-extension:', 'edge:', 'about:', 'file:']
  return !unsupportedProtocols.some((protocol) => url.startsWith(protocol))
}

type AccessibilityTextItem = { role?: string; text: string; type: string }

/** 尝试从字段中提取字符串值 */
const normalizeStringField = (field: any, seen: WeakSet<object> = new WeakSet()): string | undefined => {
  if (field === null || field === undefined) {
    return undefined
  }
  if (typeof field === 'string' || typeof field === 'number') {
    const text = String(field).trim()
    return text.length ? text : undefined
  }
  if (typeof field === 'object') {
    if (seen.has(field)) {
      return undefined
    }
    seen.add(field)
    const candidates = [field.value, field.stringValue, field.literal, field.description]
    for (const candidate of candidates) {
      const normalized = normalizeStringField(candidate, seen)
      if (normalized) {
        return normalized
      }
    }
  }
  return undefined
}

/**
 * 从无障碍树节点中提取文本信息
 * @param node 无障碍树节点
 * @param texts 文本信息数组（用于收集）
 * @param nodeMap nodeId 与节点的映射（当 childIds 需要解析时使用）
 * @param visited 已访问节点集合，避免重复遍历
 * @param depth 当前深度（用于限制递归深度）
 */
const extractTextFromNode = (
  node: any,
  texts: AccessibilityTextItem[],
  nodeMap?: Map<string, any>,
  visited: Set<string> = new Set(),
  depth = 0
): void => {
  if (!node || depth > 20) {
    return
  }

  const nodeId = node.nodeId
  if (nodeId) {
    if (visited.has(nodeId)) {
      return
    }
    visited.add(nodeId)
  }

  const role = normalizeStringField(node.role)
  const addText = (text: string | undefined, type: AccessibilityTextItem['type']) => {
    if (!text || text.length < 2) {
      return
    }
    const exists = texts.some((item) => item.text === text && item.role === role)
    if (!exists) {
      texts.push({ role, text, type })
    }
  }

  const nameText = normalizeStringField(node.name)
  addText(nameText, 'name')

  const valueText = normalizeStringField(node.value)
  if (valueText && valueText !== nameText) {
    addText(valueText, 'value')
  }

  addText(normalizeStringField(node.description), 'description')
  addText(normalizeStringField(node.help), 'help')
  addText(normalizeStringField(node.placeholder), 'placeholder')

  if (Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      extractTextFromNode(child, texts, nodeMap, visited, depth + 1)
    })
  }

  if (node.childIds && Array.isArray(node.childIds) && nodeMap) {
    node.childIds.forEach((childId: string) => {
      const childNode = nodeMap.get(childId)
      if (childNode) {
        extractTextFromNode(childNode, texts, nodeMap, visited, depth + 1)
      }
    })
  }
}

/**
 * 从无障碍树中提取所有文本信息
 * @param treeData 无障碍树数据
 * @returns 提取的文本信息数组
 */
export const extractTextFromTree = (treeData: any): AccessibilityTextItem[] => {
  const texts: AccessibilityTextItem[] = []
  const visited = new Set<string>()

  // 处理完整树格式（有 nodes 数组）
  if (treeData?.nodes && Array.isArray(treeData.nodes)) {
    const nodeMap = new Map<string, any>()
    treeData.nodes.forEach((node: any) => {
      if (node?.nodeId) {
        nodeMap.set(node.nodeId, node)
      }
    })
    treeData.nodes.forEach((node: any) => {
      extractTextFromNode(node, texts, nodeMap, visited)
    })
  }
  // 处理快照格式（单个节点）
  else if (treeData) {
    extractTextFromNode(treeData, texts, undefined, visited)
  }

  // 过滤掉空文本和过短的文本（少于2个字符的文本通常不重要）
  return texts.filter((item) => item.text && item.text.length >= 2)
}

/**
 * 使用 chrome.debugger API 和 CDP 协议获取无障碍树
 * @param tabId 目标标签页 ID，如果不提供则使用当前活动标签页
 * @returns 无障碍树数据
 */
export const getAccessibilityTree = async (tabId?: number): Promise<any> => {
  // 如果没有提供 tabId，获取当前活动标签页
  if (!tabId) {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tabs[0]?.id) {
      throw new Error('无法获取当前活动标签页')
    }
    tabId = tabs[0].id
  }

  // 检查标签页信息
  const tab = await browser.tabs.get(tabId)
  if (!tab) {
    throw new Error(`无法获取标签页信息 (tabId: ${tabId})`)
  }

  // 检查页面 URL 是否支持
  if (!isPageSupported(tab.url)) {
    throw new Error(
      `当前页面不支持无障碍树访问。不支持的页面类型包括：chrome://、chrome-extension://、about:// 等系统页面。当前页面：${tab.url || '未知'}`
    )
  }

  // 检查页面加载状态
  if (tab.status !== 'complete') {
    throw new Error(`页面尚未完全加载，请等待页面加载完成后再试。当前状态：${tab.status}`)
  }

  const debuggee = { tabId }

  return new Promise((resolve, reject) => {
    // 1. 附加调试器到目标标签页
    chrome.debugger.attach(debuggee, '1.3', (attachError?: Error) => {
      if (chrome.runtime.lastError || attachError) {
        const errorMsg = chrome.runtime.lastError?.message || attachError?.message || '附加调试器失败'
        // 提供更详细的错误信息
        let detailedError = errorMsg
        if (errorMsg.includes('Another debugger')) {
          detailedError = '另一个调试器已附加到此页面，请关闭其他调试工具（如 Chrome DevTools）后重试'
        } else if (errorMsg.includes('Cannot access')) {
          detailedError = '无法访问此页面，可能是系统页面或受保护的页面'
        }
        reject(new Error(detailedError))
        return
      }

      // 2. 启用无障碍域
      chrome.debugger.sendCommand(debuggee, 'Accessibility.enable', {}, (enableError?: Error) => {
        if (chrome.runtime.lastError) {
          // 如果启用失败，先分离调试器再拒绝
          chrome.debugger.detach(debuggee, () => {})
          const errorMsg = chrome.runtime.lastError?.message || enableError?.message || '启用无障碍域失败'
          reject(new Error(errorMsg))
          return
        }

        // 3. 先尝试获取完整的无障碍树
        chrome.debugger.sendCommand(
          debuggee,
          'Accessibility.getFullAXTree',
          {},
          (result?: any, getTreeError?: Error) => {
            // 如果获取完整树失败，尝试使用 getSnapshot 作为备用方案
            if (chrome.runtime.lastError || getTreeError) {
              console.warn(
                '获取完整无障碍树失败，尝试使用快照方式:',
                chrome.runtime.lastError?.message || getTreeError?.message
              )

              // 备用方案：使用 getSnapshot
              chrome.debugger.sendCommand(
                debuggee,
                'Accessibility.getSnapshot',
                { root: null },
                (snapshotResult?: any, snapshotError?: Error) => {
                  // 无论成功与否，都要分离调试器
                  chrome.debugger.detach(debuggee, () => {})

                  if (chrome.runtime.lastError || snapshotError) {
                    const errorMsg = chrome.runtime.lastError?.message || snapshotError?.message || '获取无障碍树失败'
                    reject(
                      new Error(
                        `${errorMsg}。这可能是因为当前页面不支持无障碍树访问，或者浏览器环境限制。请确保：1) 页面已完全加载；2) 不是系统页面（如 chrome://）；3) 没有其他调试器附加到此页面。`
                      )
                    )
                    return
                  }

                  // 返回快照数据
                  resolve(snapshotResult)
                }
              )
              return
            }

            // 无论成功与否，都要分离调试器
            chrome.debugger.detach(debuggee, () => {})

            // 4. 返回完整的无障碍树数据
            resolve(result)
          }
        )
      })
    })
  })
}
