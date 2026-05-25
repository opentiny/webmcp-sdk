import { writeFileSync } from 'fs'
import type CDP from 'chrome-remote-interface'

export type RunHandler = (client: CDP.Client, args: string[]) => Promise<void>

/**
 * 导航到指定 URL
 */
export const handleNavigate: RunHandler = async (client, args) => {
  if (!args[0]) {
    console.error('命令有误: 请提供 URL')
    process.exit(1)
  }

  const url = args[0]
  const { Page } = client

  await Page.enable()
  await Page.navigate({ url })
  await Page.loadEventFired()

  console.log(`已导航到: ${url}`)
}

/**
 * 截取屏幕截图并保存
 */
export const handleScreenshot: RunHandler = async (client, args) => {
  const { Page } = client
  const outputPath = args[0] || 'screenshot.png'

  await Page.enable()
  const screenshot = await Page.captureScreenshot({ format: 'png' })

  writeFileSync(outputPath, Buffer.from(screenshot.data, 'base64'))
  console.log(`截图已保存: ${outputPath}`)
}

/**
 * 执行 JavaScript 代码
 */
export const handleEvaluate: RunHandler = async (client, args) => {
  if (!args[0]) {
    console.error('命令有误: 请提供 JavaScript 代码')
    process.exit(1)
  }

  const { Runtime } = client
  const code = args.join(' ')

  await Runtime.enable()
  const result = await Runtime.evaluate({ expression: code, returnByValue: true })

  if (result.exceptionDetails) {
    console.error('执行出错:', result.exceptionDetails.text)
    process.exit(1)
  } else {
    console.log('执行结果:', JSON.stringify(result.result.value, null, 2))
  }
}
