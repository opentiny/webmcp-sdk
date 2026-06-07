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

    // argsJson 已在 bin.ts 中完成 @base64file 展开与 JSON 校验
    const cleanedArgs = argsJson.trim()

    const result = await page.evaluate(
      async (name, inputString) => {
        const mcp = (navigator as any).modelContextTesting || (navigator as any).modelContext

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
      },
      toolName,
      cleanedArgs
    )

    return result
  } finally {
    await browser.disconnect()
  }
}
