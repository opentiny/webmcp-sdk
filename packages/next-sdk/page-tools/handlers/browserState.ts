import type { ActionContext } from '../context'

export async function handleBrowserState(args: any, ctx: ActionContext) {
  if (window.__webmcpcli_beforeGetBrowserState) {
    window.__webmcpcli_beforeGetBrowserState()
  }
  return ctx.buildBrowserStateResponse(args.responseMode ?? 'diff')
}
