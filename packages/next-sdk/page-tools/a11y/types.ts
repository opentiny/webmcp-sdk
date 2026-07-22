/**
 * a11y/types.ts
 *
 * 定义无障碍树模块（A11y Tree）的核心接口和类型。
 */

import type { A11yConfig } from './config'

/** ref 索引 → HTMLElement 映射，供 click/fill/select 操作使用 */
export type RefMap = Map<number, HTMLElement>

/** 内部中间态节点，与 DOM 解耦，便于剪枝和序列化 */
export interface VNode {
  /** 节点的 ARIA 角色 (如 'button', 'link', 'textbox') */
  role: string
  /** W3C AccName 算法计算出的语义化名称 */
  name: string
  /**
   * 自身声明名（aria-label / aria-labelledby，或 role 规则的 name），不含内容汇总。
   * 序列化混合子树时优先使用，避免布局 landmark 被 Static-Lift / 剪枝抹掉。
   */
  declaredName?: string
  /** 元素相关的状态和属性标记 (如 'checked', 'disabled', 'value="xxx"') */
  tokens: string[]
  /** 只有交互节点才有 ref (内部索引，用于标识可在其上执行交互动作的元素) */
  ref?: number
  /** 关联的 DOM 元素实例 */
  el: HTMLElement
  /** 包含的子节点列表 */
  children: VNode[]
}

/**
 * 构建无障碍树时的配置选项。
 * 继承统一的 A11yConfig（角色/状态规则、白/黑名单、自定义暴露属性、弹窗选择器），
 * 并额外提供两个控制树"形状"（而非无障碍语义）的选项。
 */
export interface A11yTreeOptions extends A11yConfig {
  /**
   * 是否启用剪枝：无 ref 且无 accessible name 的节点透明穿透
   * 默认 true（推荐）
   */
  pruneUnnamed?: boolean
  /**
   * 强制保留的角色列表，即使无 name 也不穿透（优先级最高）
   * 例如：['table', 'row'] 用于保留表格结构
   */
  preserveRoles?: string[]
}

/** 序列化 YAML 树时实际用到的形状选项（与无障碍语义解析无关，独立于 A11yConfig） */
export interface A11yTreeShapeOptions {
  pruneUnnamed: boolean
  preserveRoles: string[]
}

/** 构建无障碍树的返回结果 */
export interface A11yTreeResult {
  /** 语义化 YAML 文本（供 AI 阅读和 Diff 计算） */
  yaml: string
  /** ref 索引 → HTMLElement 映射（供后续操作使用） */
  refMap: RefMap
  /** 可交互元素总数 */
  interactiveCount: number
  /** 原始行数组（不含 yaml 代码块包裹），供搜索使用 */
  lines: string[]
}

/** 关键词搜索选项 */
export interface SearchA11yTreeOptions extends A11yTreeOptions {
  /**
   * 每个匹配行前后保留的上下文行数（类似 grep -C N）
   * 默认 2
   */
  contextLines?: number
  /**
   * 是否大小写不敏感，默认 true
   */
  caseInsensitive?: boolean
  /**
   * 最大返回匹配分组数（防止命中过多撑爆上下文），默认 20
   */
  maxMatches?: number
}

/** 单个搜索匹配的分组结构 */
export interface A11ySearchMatch {
  /** 主命中行行号（1-based） */
  lineNumber: number
  /** 主命中行内容 */
  line: string
  /** 含上下文的行列表（带行号） */
  context: Array<{ lineNumber: number; line: string }>
}

/** searchA11yTree 函数的返回结果 */
export interface SearchA11yTreeResult {
  /** 格式化后可直接发给 LLM 的文本 */
  text: string
  /** 结构化匹配列表 */
  matches: A11ySearchMatch[]
  /** 无障碍树总行数 */
  totalLines: number
  /** 原始命中行数（去重前） */
  matchCount: number
  /** 返回搜索时的 ref 映射 */
  refMap: RefMap
  /** 返回搜索时的 yaml 状态，用于更新缓存 */
  yaml: string
}
