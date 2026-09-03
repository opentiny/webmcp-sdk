import type { ActionContext } from '../context'

export async function handleExecuteJavascript(args: any, ctx: ActionContext) {
  if (!args.script) return ctx.errContent('脚本执行异常: 缺少javascript代码')
  // eslint-disable-next-line no-new-func
  // 方式1：将脚本包裹在 async IIFE 中执行，允许 return 语句
  let result = await new Function(`return (async () => { ${args.script} })()`)()
  // 方式2：若 result 为 undefined（脚本没有 return），降级尝试以表达式方式求值
  // 场景：Agent 写了 "Array.from(...).map(...)" 但没有 return 关键字
  if (result === undefined) {
    try {
      // eslint-disable-next-line no-new-func
      result = await new Function(`return (async () => (${args.script}))()`)()
    } catch {
      // 表达式求值也失败（如含 await/let/const 等语句），保持 undefined
    }
  }
  return {
    content: [{ type: 'text' as const, text: `脚本执行结果: ${JSON.stringify(result)}` }]
  }
}
