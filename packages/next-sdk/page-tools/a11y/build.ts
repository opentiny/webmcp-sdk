/**
 * a11y/build.ts
 *
 * 暴露生成整棵无障碍树的主逻辑方法。
 */

import type { A11yTreeOptions, A11yTreeResult, A11yTreeShapeOptions, RefMap } from './types'
import type { A11yConfig } from './config'
import { ensureResolvedA11yConfig } from './config'
import { buildVNode, serializeVNode } from './vnode'
import { getComposedChildren } from './utils'
import { deepQuerySelectorAll } from '../utils/dom'
import { HIGHLIGHT_CONTAINER_ID } from '../page-agent-highlight'

/** 将 whitelist/blacklist 中的 Element 引用与 CSS 选择器字符串统一解析为元素集合（字符串每次动态解析，适配 SPA 重渲染） */
function resolveElementList(list: Array<Element | string>, root: Element): Set<Element> {
  const set = new Set<Element>()
  for (const item of list) {
    if (typeof item === 'string') {
      try {
        for (const el of deepQuerySelectorAll(item, root)) set.add(el)
      } catch {
        // 忽略非法选择器
      }
    } else if (item) {
      set.add(item)
    }
  }
  return set
}

/**
 * 生成当前页面的语义化 ARIA YAML 树
 *
 * @param root 遍历起点，默认 document.body
 * @param config 统一无障碍配置（角色/状态规则、白/黑名单、自定义属性等）+ 树形状选项（pruneUnnamed/preserveRoles）
 */
export function buildA11yTree(root: Element = document.body, config?: A11yConfig & A11yTreeOptions): A11yTreeResult {
  const { pruneUnnamed = true, preserveRoles = [], ...a11yConfig } = config ?? {}
  // 运行期 a11yConfig 通常已是 ResolvedA11yConfig，走快路径避免再次与默认配置拼接
  const resolved = ensureResolvedA11yConfig(a11yConfig)
  const shapeOpts: A11yTreeShapeOptions = { pruneUnnamed, preserveRoles }

  // 使用对象引用避免全局可变状态，消除并发调用隐患
  const refCounter = { value: 0 }
  const refMap: RefMap = new Map()
  const blacklistSet = resolveElementList(resolved.blacklist, root)
  const whitelistSet = resolveElementList(resolved.whitelist, root)
  const lines: string[] = []

  // 永远过滤高亮容器
  const highlightContainer = document.getElementById(HIGHLIGHT_CONTAINER_ID)
  if (highlightContainer) blacklistSet.add(highlightContainer)

  for (const child of getComposedChildren(root)) {
    const vnode = buildVNode(child, refCounter, refMap, blacklistSet, whitelistSet, resolved)
    if (vnode) {
      lines.push(...serializeVNode(vnode, 0, shapeOpts))
    }
  }

  const yaml = '```yaml\n' + lines.join('\n') + '\n```'

  return {
    yaml,
    refMap,
    interactiveCount: refMap.size,
    lines,
  }
}
