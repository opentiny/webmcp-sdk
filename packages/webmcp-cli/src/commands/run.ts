import { connectBrowser, getTargetPage } from '../browser'

export async function runCommand({
  toolName,
  argsJson,
  tabid
}: {
  toolName: string
  argsJson: string
  tabid?: string
}) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)
    const urlBefore = page.url()

    // argsJson 已在 bin.ts 中完成 @base64file 展开与 JSON 校验
    const cleanedArgs = argsJson.trim()

    let result: any
    try {
      result = await page.evaluate(async (name, inputString) => {
        const mcp = (navigator as any).modelContextTesting || (navigator as any).modelContext

        if (!mcp || typeof mcp.executeTool !== 'function') {
          throw new Error('当前页面没有注入 WebMCP 环境 (navigator.modelContextTesting.executeTool 未找到)')
        }

        // executeTool 的第二个参数必须是 JSON 字符串
        let res = await mcp.executeTool(name, inputString)

        // executeTool 的返回值可能是普通对象，也可能是 JSON 字符串
        if (typeof res === 'string') {
          try {
            res = JSON.parse(res)
          } catch {
            // 保留原始字符串
          }
        }

        if (res === undefined || res === null) {
          throw new Error('工具 execute 未返回结果，请检查工具实现是否缺少 return')
        }

        if (typeof res === 'object' && (res as { success?: boolean }).success === false) {
          const failed = res as { error?: string; message?: string }
          throw new Error(failed.error || failed.message || '工具执行失败')
        }

        return res
      }, toolName, cleanedArgs)
    } catch (evalError: unknown) {
      const errMsg = evalError instanceof Error ? evalError.message : String(evalError)

      // 识别"执行上下文已销毁"错误：这通常是工具执行期间页面发生了正常导航（如发布后跳转）
      // 此时工具实际上已经成功执行，跳转本身就是成功的副作用，不应报错
      const isContextDestroyed =
        errMsg.includes('context was destroyed') ||
        errMsg.includes('Execution context was destroyed') ||
        errMsg.includes('Cannot read properties of null') && errMsg.includes('context')

      if (isContextDestroyed) {
        // 等待导航稳定，然后读取新页面 URL
        await new Promise(resolve => setTimeout(resolve, 800))
        let newUrl = ''
        try {
          // 重新获取页面（导航后 page 对象可能失效，从 browser 重新拿）
          const pages = await browser.pages()
          const activePage = pages.find(p => !p.url().startsWith('devtools://') && !p.url().startsWith('about:'))
          newUrl = activePage?.url() ?? ''
        } catch { /* 忽略 */ }

        // 如果 URL 已经发生变化，认为是正常导航触发的上下文销毁（工具执行成功）
        if (newUrl && newUrl !== urlBefore) {
          return {
            success: true,
            message: `工具 ${toolName} 执行完成，页面已导航至 ${newUrl}`,
            navigatedTo: newUrl
          }
        }
        // URL 未变化，可能是真正的错误，重新抛出
      }

      throw evalError
    }

    return result
  } finally {
    await browser.disconnect()
  }
}

