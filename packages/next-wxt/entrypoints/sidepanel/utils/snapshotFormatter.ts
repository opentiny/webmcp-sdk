// 快照格式化工具
// 参考 chrome-devtools-mcp 的 snapshotFormatter.ts

import type { SnapshotNode, Snapshot } from './snapshotManager'

/**
 * 获取节点的属性字符串
 * 参考 chrome-devtools-mcp 的 getAttributes
 */
function getAttributes(node: SnapshotNode): string[] {
  const attrs: string[] = []

  // UID
  attrs.push(`uid=${node.id}`)

  // Role
  const role = typeof node.role === 'string' ? node.role : node.role?.value
  if (role) {
    attrs.push(role)
  }

  // Name
  const name = typeof node.name === 'string' ? node.name : node.name?.value
  if (name) {
    // 如果 name 包含空格或特殊字符，用引号包裹
    const needsQuotes = name.includes(' ') || name.includes('\n')
    attrs.push(needsQuotes ? `"${name}"` : name)
  }

  // Value（如果有且与 name 不同）
  const value = typeof node.value === 'string' ? node.value : node.value?.value
  if (value && value !== name) {
    const needsQuotes = value.includes(' ') || value.includes('\n')
    attrs.push(needsQuotes ? `"${value}"` : value)
  }

  // 属性标记
  if (node.backendNodeId || node.backendDOMNodeId) {
    attrs.push('clickable')
  }

  // Editable
  if (role === 'textbox' || role === 'combobox') {
    attrs.push('editable')
  }

  return attrs
}

/**
 * 格式化快照节点为文本
 * 参考 chrome-devtools-mcp 的 formatSnapshotNode
 * @param root 根节点
 * @param snapshot 快照对象（可选）
 * @param depth 当前深度
 */
export function formatSnapshotNode(root: SnapshotNode, snapshot?: Snapshot, depth = 0): string {
  const chunks: string[] = []

  // 顶层内容
  if (depth === 0) {
    // 可以在这里添加快照的元信息
    // 例如：选中的元素提示等
  }

  // 获取节点属性
  const attributes = getAttributes(root)
  const line = ' '.repeat(depth * 2) + attributes.join(' ') + '\n'
  chunks.push(line)

  // 递归处理子节点
  for (const child of root.children) {
    chunks.push(formatSnapshotNode(child, snapshot, depth + 1))
  }

  return chunks.join('')
}

/**
 * 格式化快照为文本格式
 * @param snapshot 快照对象
 */
export function formatSnapshot(snapshot: Snapshot): string {
  return formatSnapshotNode(snapshot.root, snapshot)
}
