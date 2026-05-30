import { connectBrowser, getTargetPage } from '../browser'

export async function evaluateCommand({
  jsScript,
  tabid
}: {
  jsScript: string
  tabid?: string
}) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)

    const result = await page.evaluate(async (script) => {
      try {
        // 使用 eval 执行传入的 JavaScript 代码
        // eslint-disable-next-line no-eval
        const result = eval(script)
        
        // 如果结果是 Promise，等待其完成
        if (result instanceof Promise) {
          return await result
        }
        
        return result
      } catch (error: any) {
        return {
          error: true,
          message: error.message,
          stack: error.stack
        }
      }
    }, jsScript)

    return result
  } finally {
    await browser.disconnect()
  }
}
