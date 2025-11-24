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

  const nodeId = node.nodeId || node.id
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
 * @param treeData 无障碍树数据（可以是快照节点或树结构）
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
  // 处理快照格式（单个节点，支持新的 SnapshotNode 格式）
  else if (treeData) {
    extractTextFromNode(treeData, texts, undefined, visited)
  }

  // 过滤掉空文本和过短的文本（少于2个字符的文本通常不重要）
  return texts.filter((item) => item.text && item.text.length >= 2)
}
