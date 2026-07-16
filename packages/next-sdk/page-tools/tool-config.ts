/**
 * tool-config.ts
 *
 * registerPageAgentTool 的完整运行期配置：顶层选项（enableHighlight 等）+ 统一无障碍配置（a11yConfig）。
 * 两者合并到同一个配置对象里，提供唯一一套运行期读写 API（getPageAgentToolConfig/setPageAgentToolConfig）：
 * 注册时初始化一次，之后可随时读取/修改，无需分别记住两套 get/set 函数。
 */

import type { A11yConfig, ResolvedA11yConfig } from './a11y/config'
import { DEFAULT_A11Y_CONFIG, mergeA11yConfig, mergeA11yConfigs } from './a11y/config'

export interface PageAgentToolConfig {
  /** 是否启用元素高亮 */
  enableHighlight: boolean
  /**
   * 统一无障碍配置：按角色（roles）、状态（states：selected/disabled/error/warning 等）自定义规则，
   * 以及白名单/黑名单/自定义暴露属性/弹窗选择器。已与默认配置合并（数组类字段是拼接结果）。
   */
  a11yConfig: ResolvedA11yConfig
}

/**
 * 用于初始化（registerPageAgentTool 的入参）或运行期 setPageAgentToolConfig 的补丁对象：
 * enableHighlight 为覆盖式更新；a11yConfig 为拼接式合并（数组类字段追加，不丢已有规则，语义见 a11y/config.ts）。
 */
export interface PageAgentToolConfigPatch {
  /** 是否启用元素高亮 */
  enableHighlight?: boolean
  /** 是否在工具调用后移除遮罩， 默认值为 true 移除 */
  removeMaskAterToolCall?: boolean
  /** 是否在工具调用后移除遮罩 */
  /** 统一无障碍配置，会与当前生效的 a11yConfig 按数组拼接合并 */
  a11yConfig?: A11yConfig
}

/** registerPageAgentTool(options) 的入参类型，与运行期补丁 {@link PageAgentToolConfigPatch} 完全一致 */
export type PageAgentToolOptions = PageAgentToolConfigPatch

/** 默认生效的完整工具配置 */
export const DEFAULT_PAGE_AGENT_TOOL_CONFIG: PageAgentToolConfig = {
  enableHighlight: false,
  a11yConfig: DEFAULT_A11Y_CONFIG
}

declare global {
  interface Window {
    /** 运行期唯一生效的 page-agent-tool 完整配置（已与默认值合并），可通过 getPageAgentToolConfig/setPageAgentToolConfig 读写 */
    __webmcpcli_toolConfig?: PageAgentToolConfig
  }
}

/** 读取当前生效的完整工具配置（已与默认值合并）。未初始化时返回默认配置 */
export function getPageAgentToolConfig(): PageAgentToolConfig {
  if (typeof window !== 'undefined' && window.__webmcpcli_toolConfig) {
    return window.__webmcpcli_toolConfig
  }
  return { enableHighlight: DEFAULT_PAGE_AGENT_TOOL_CONFIG.enableHighlight, a11yConfig: mergeA11yConfig() }
}

function resolvePatch(patch: PageAgentToolConfigPatch, base: PageAgentToolConfig): PageAgentToolConfig {
  return {
    enableHighlight: patch.enableHighlight ?? base.enableHighlight,
    a11yConfig: mergeA11yConfigs(base.a11yConfig, patch.a11yConfig ?? {})
  }
}

/**
 * 更新当前生效配置。
 * - patch 为对象时：enableHighlight 覆盖式更新；a11yConfig 与当前配置按数组拼接合并（不丢已有规则）
 * - patch 为函数时：入参为当前生效配置，返回值直接与默认配置合并（而不是再与 current 相加）。
 *   这样函数体内可以对 current.a11yConfig 做任意过滤/裁剪（如按条件"移除"某条旧规则），
 *   返回值即为最终生效的配置，不会因为再与 current 相加而让被过滤掉的旧规则"复活"
 * - options.mode = 'replace' 时（仅影响对象类型的 patch）：不与"当前生效配置"合并，而是与默认配置重新合并
 * 返回合并后的最新完整配置，并写回运行期存储供 buildBrowserStateResponse/buildA11yTree 等读取。
 */
export function setPageAgentToolConfig(
  patch: PageAgentToolConfigPatch | ((current: PageAgentToolConfig) => PageAgentToolConfigPatch),
  options?: { mode?: 'merge' | 'replace' }
): PageAgentToolConfig {
  const mode = options?.mode ?? 'merge'
  const current = getPageAgentToolConfig()

  const next =
    typeof patch === 'function'
      ? resolvePatch(patch(current), DEFAULT_PAGE_AGENT_TOOL_CONFIG)
      : resolvePatch(patch, mode === 'replace' ? DEFAULT_PAGE_AGENT_TOOL_CONFIG : current)

  if (typeof window !== 'undefined') {
    window.__webmcpcli_toolConfig = next
  }
  return next
}
