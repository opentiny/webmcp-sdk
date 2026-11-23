import { searchA11yTree } from '../a11y-tree'
import { detectPageDialog, detectValidationErrors } from '../utils/dom'
import { getPageAgentToolConfig } from '../tool-config'
import type { ActionContext } from '../context'
import type { PageAgentToolInput } from '../schema'

export async function handleSearchTree(args: PageAgentToolInput, ctx: ActionContext) {
  if (!args.query) return ctx.errContent('搜索失败: 缺少 query 参数')
  const result = searchA11yTree(args.query, document.body, {
    ...getPageAgentToolConfig().a11yConfig,
    refAllocator: ctx.refAllocator,
    contextLines: args.contextLines,
    maxMatches: args.maxMatches,
  })

  // 同步当前最新可见元素的稳定 #ref 映射（搜到即可操作），
  // 但不更新 stateCache 基线，避免未输出全量/增量快照就推进 rev 导致宿主侧 baseRev 断链
  ctx.setRefMap(result.refMap)

  // 检测页面弹窗/校验错误，平铺为结构化字段（与 browserState 对齐）
  const dialogs = detectPageDialog()
  const validationErrors = detectValidationErrors()
  if (dialogs.length === 0 && validationErrors.length === 0) {
    return { content: [{ type: 'text' as const, text: result.text }] }
  }
  const alerts = {
    ...(dialogs.length > 0 ? { dialogs } : {}),
    ...(validationErrors.length > 0 ? { validationErrors } : {})
  }
  return {
    content: [{ type: 'text' as const, text: `${JSON.stringify(alerts)}\n${result.text}` }]
  }
}
