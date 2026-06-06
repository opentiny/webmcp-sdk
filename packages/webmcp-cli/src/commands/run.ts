import JSON5 from 'json5'
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

    // 验证并清洗、转换参数为合法的 JSON 字符串
    let cleanedArgs = argsJson.trim()
    if (cleanedArgs.startsWith("'") && cleanedArgs.endsWith("'")) {
      cleanedArgs = cleanedArgs.slice(1, -1).trim()
    }

    try {
      const obj = JSON5.parse(cleanedArgs)
      cleanedArgs = JSON.stringify(obj)
    } catch (e: any) {
      throw new Error(`参数不是有效的 JSON 或 JS 对象: ${e.message}`)
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
    }, toolName, cleanedArgs)

    return result
  } finally {
    await browser.disconnect()
  }
}
