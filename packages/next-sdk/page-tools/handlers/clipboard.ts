import type { ActionContext } from '../context'
import type { PageAgentToolInput } from '../schema'

export async function handleClipboard(args: PageAgentToolInput, ctx: ActionContext) {
  try {
    if (args.text) {
      await navigator.clipboard.writeText(args.text)
      return { content: [{ type: 'text' as const, text: '复制到剪切板成功' }] }
    } else {
      const text = await navigator.clipboard.readText()
      return { content: [{ type: 'text' as const, text: '剪切板内容为: ' + text }] }
    }
  } catch (error: any) {
    return { content: [{ type: 'text' as const, text: '操作剪切板失败: ' + error.message }] }
  }
}
