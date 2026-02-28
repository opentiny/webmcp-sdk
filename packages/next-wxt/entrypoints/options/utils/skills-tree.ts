/**
 * Skills 树形结构工具
 * 将 skillMdModules (Record<路径, 内容>) 转换为 TinyVue Tree 所需的树形数据
 */

/** 树节点类型：文件夹或文件 */
export interface SkillsTreeNode {
  /** 节点唯一 ID，使用路径作为 id */
  id: string
  /** 显示名称（文件名或文件夹名） */
  label: string
  /** 完整相对路径，如 ./month-report-expert/SKILL.md */
  path: string
  /** 是否为文件夹 */
  isFolder: boolean
  /** 文件内容（仅文件节点有） */
  content?: string
  /** 子节点（仅文件夹节点有） */
  children?: SkillsTreeNode[]
}

/**
 * 将 skillMdModules 转为树形结构
 * @param modules - key 为相对路径如 ./xxx/SKILL.md，value 为文件内容
 */
export function modulesToTree(modules: Record<string, string>): SkillsTreeNode[] {
  const root: Record<string, SkillsTreeNode> = {}

  // 仅处理技能相关文件，排除 index.ts 等；路径以 / 结尾表示空文件夹节点
  const contentExts = ['.md', '.json', '.xml', '.txt', '.yaml', '.yml', '.js']
  const isContentFile = (p: string) => contentExts.some((ext) => p.endsWith(ext))
  const isFolderOnly = (p: string) => p.replace(/^\.\//, '').endsWith('/')

  for (const rawPath of Object.keys(modules)) {
    if (!isContentFile(rawPath) && !isFolderOnly(rawPath)) continue
    // 去掉开头的 ./
    const path = rawPath.startsWith('./') ? rawPath.slice(2) : rawPath
    const parts = path.split('/').filter(Boolean) // 过滤空串，如 ./ref/ 得 ['ref']
    const content = modules[rawPath]

    let currentPath = ''
    let parent: SkillsTreeNode | null = null

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const fullPath = `./${currentPath}`
      const isLast = i === parts.length - 1
      const isFolderNode = !isLast || isFolderOnly(rawPath) // 非最后一段，或空文件夹路径

      if (root[fullPath]) {
        parent = root[fullPath]
        continue
      }

      const node: SkillsTreeNode = {
        id: fullPath,
        label: part,
        path: fullPath,
        isFolder: isFolderNode,
        ...(isFolderNode ? { children: [] } : { content })
      }

      root[fullPath] = node

      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(node)
      }

      parent = node
    }
  }

  // 按路径排序子节点，文件夹在前、文件在后
  function sortChildren(nodes: SkillsTreeNode[]): SkillsTreeNode[] {
    return [...nodes].sort((a, b) => {
      const aIsFolder = a.isFolder ? 1 : 0
      const bIsFolder = b.isFolder ? 1 : 0
      if (bIsFolder !== aIsFolder) return bIsFolder - aIsFolder
      return a.label.localeCompare(b.label)
    })
  }

  function sortTree(n: SkillsTreeNode): SkillsTreeNode {
    if (n.children && n.children.length > 0) {
      n.children = sortChildren(n.children).map(sortTree)
    }
    return n
  }

  // 取根级节点（skills 下的直接子项）
  const topLevelPaths = Object.keys(root).filter((p) => {
    const rel = p.replace(/^\.\//, '')
    return !rel.includes('/')
  })

  const topLevel = topLevelPaths
    .map((p) => root[p])
    .filter((n) => n)
    .sort((a, b) => {
      const aIsFolder = a.isFolder ? 1 : 0
      const bIsFolder = b.isFolder ? 1 : 0
      if (bIsFolder !== aIsFolder) return bIsFolder - aIsFolder
      return a.label.localeCompare(b.label)
    })

  return topLevel.map(sortTree)
}

/**
 * 根据路径在树中查找节点
 */
export function findNodeByPath(nodes: SkillsTreeNode[], path: string): SkillsTreeNode | null {
  for (const n of nodes) {
    if (n.path === path) return n
    if (n.children) {
      const found = findNodeByPath(n.children, path)
      if (found) return found
    }
  }
  return null
}
