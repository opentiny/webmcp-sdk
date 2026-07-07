import type { ActionContext } from '../context'

export async function handleBrowserState(args: any, ctx: ActionContext) {
  if (window.__webmcpcli_beforeGetBrowserState) {
    try {
      window.__webmcpcli_beforeGetBrowserState()
    } catch (e) {
      console.warn('__webmcpcli_beforeGetBrowserState error:', e)
    }
  }
  return ctx.buildBrowserStateResponse(args.responseMode ?? 'diff')
}
