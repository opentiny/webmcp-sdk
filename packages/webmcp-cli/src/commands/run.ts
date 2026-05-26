import { connectBrowser, getTargetPage } from '../browser'

export async function runCommand({
  toolName,
  argsJson,
  tabid
}: {
  toolName: string
  argsJson: string
  tabid?: number
}) {
  const browser = await connectBrowser()
  try {
    const page = await getTargetPage(browser, tabid)

    // 验证一下是否是合法的 JSON，以防用户传入了非法的字符串
    try {
      JSON.parse(argsJson)
    } catch (e: any) {
      throw new Error(`参数不是有效的 JSON: ${e.message}`)
    }

    const result = await page.evaluate(async (name, inputString) => {
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
        } catch (e) {
          // ignore
        }
      }
      return res
    }, toolName, argsJson)

    return result
  } finally {
    await browser.disconnect()
  }
}
