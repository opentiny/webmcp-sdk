import { searchA11yTree } from '../a11y-tree'
import { detectPageDialog, detectValidationErrors } from '../utils/dom'
import { DEFAULT_ERROR_SELECTORS } from '../constants'
import type { ActionContext } from '../context'

export async function handleSearchTree(args: any, ctx: ActionContext) {
  if (!args.query) return ctx.errContent('搜索失败: 缺少 query 参数')
  const blacklist = (window.__webmcpcli_interactiveBlacklist ?? []) as Element[]
  const whitelist = (window.__webmcpcli_interactiveWhitelist ?? []) as Element[]
  const exposedAttributes = (window.__webmcpcli_exposedAttributes ?? []) as string[]
  const result = searchA11yTree(args.query, document.body, blacklist, whitelist, {
    contextLines: args.contextLines,
    maxMatches: args.maxMatches,
    exposedAttributes,
    errorSelectors: (window.__webmcpcli_errorSelectors ?? DEFAULT_ERROR_SELECTORS).join(', '),
  })
  
  ctx.setRefMap(result.refMap)
  ctx.stateCache.update(window.location.href, result.yaml)
  
  await ctx.pageController.hideMask()
  // 检测页面弹窗/遮罩层，帮助 AI 发现可能遮挡目标的确认弹窗
  const dialogAlert = detectPageDialog()
  // 检测表单校验错误，提醒 AI 优先修复
  const validationErrors = detectValidationErrors()
  const alerts = `${dialogAlert}${validationErrors}`
  return {
    content: [{ type: 'text' as const, text: alerts ? `${alerts}\n${result.text}` : result.text }]
  }
}
