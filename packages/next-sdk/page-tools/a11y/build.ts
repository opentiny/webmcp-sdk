/**
 * a11y/build.ts
 *
 * 暴露生成整棵无障碍树的主逻辑方法。
 */

import type { A11yTreeOptions, A11yTreeResult, RefMap } from './types'
import { DEFAULT_ERROR_SELECTORS, DEFAULT_WARNING_SELECTORS } from './constants'
import { buildVNode, serializeVNode } from './vnode'
import { getComposedChildren } from './utils'

const DEFAULT_OPTIONS: Required<A11yTreeOptions> = {
  pruneUnnamed: true,
  preserveRoles: [],
  exposedAttributes: [],
  errorSelectors: DEFAULT_ERROR_SELECTORS,
  warningSelectors: DEFAULT_WARNING_SELECTORS,
}

/**
 * 生成当前页面的语义化 ARIA YAML 树
 *
 * @param root 遍历起点，默认 document.body
 * @param blacklist 需要跳过的元素（用户自定义黑名单）
 * @param whitelist 需要识别为可交互的白名单元素列表
 * @param options 过滤选项
 */
export function buildA11yTree(
  root: Element = document.body,
  blacklist: Element[] = [],
  whitelist: Element[] = [],
  options?: A11yTreeOptions,
): A11yTreeResult {
  const opts: Required<A11yTreeOptions> = { ...DEFAULT_OPTIONS, ...options }
  // 使用对象引用避免全局可变状态，消除并发调用隐患
  const refCounter = { value: 0 }
  const refMap: RefMap = new Map()
  const blacklistSet = new Set(blacklist)
  const whitelistSet = new Set(whitelist)
  const lines: string[] = []

  for (const child of getComposedChildren(root)) {
    const vnode = buildVNode(child, refCounter, refMap, blacklistSet, whitelistSet, opts.exposedAttributes, opts.errorSelectors, opts.warningSelectors)
    if (vnode) {
      lines.push(...serializeVNode(vnode, 0, opts))
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
