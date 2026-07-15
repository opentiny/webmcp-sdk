import { connectBrowser, getTargetPage, injectIntoPage } from '../browser'
import { zhihuCreateArticle } from '../zhihu/create-article'
import { isZhihuWriteUrl } from '../zhihu/markdown'

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

    // 执行前强制重注入，确保页面上的 page-agent-tool 与当前 CLI 构建一致
    await injectIntoPage(page)

    // argsJson 已在 bin.ts 中完成 @base64file 展开与 JSON 校验
    const cleanedArgs = argsJson.trim()

    // 知乎专栏：在 Node 端完成 Markdown→HTML 转换 + 真实剪贴板粘贴（Draft.js 兼容）
    if (toolName === 'create_article') {
      let parsedArgs: { title?: string; content?: string }
      try {
        parsedArgs = JSON.parse(cleanedArgs)
      } catch {
        throw new Error('参数不是有效的 JSON')
      }
      if (isZhihuWriteUrl(page.url())) {
        return await zhihuCreateArticle(page, parsedArgs)
      }
    }

    let result: any
    try {
      result = await page.evaluate(async (name, inputString) => {
        // @ts-expect-error WebMCP APIs are experimental and not yet in DOM types
        const mcp = document.modelContext || document.modelContext || document.modelContext

        if (!mcp || typeof mcp.executeTool !== 'function') {
          throw new Error('当前页面没有注入 WebMCP 环境 (document.modelContext 未找到)')
        }

        // executeTool 的第二个参数必须是 JSON 字符串
        const tools = await mcp.getTools();
        const toolObj = tools.find((t: any) => t.name === name);
        if (!toolObj) throw new Error(`Tool ${name} not found`);
        let res = await mcp.executeTool(toolObj, inputString)

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
          // 重新读取页面（导航后 JS 上下文虽被销毁，但 page 实例本身的 url() 依然是最新的）
          newUrl = page.url()
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

