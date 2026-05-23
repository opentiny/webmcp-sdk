import CDP from 'chrome-remote-interface'

const DEBUG_PORT = 9523

/**
 * 获取浏览器信息
 */
export async function listBrowserInfo(): Promise<void> {
  let client: CDP.Client | null = null
  try {
    client = await CDP({ port: DEBUG_PORT })
    const { Browser, Target } = client

    // 获取浏览器版本信息
    const version = await Browser.getVersion()
    console.log('\n=== 浏览器信息 ===')
    console.log(`名称: ${version.product}`)
    console.log(`协议版本: ${version.protocolVersion}`)
    console.log(`User-Agent: ${version.userAgent}`)
    console.log(`JS 版本: ${version.jsVersion || 'N/A'}`)

    // 获取所有标签页
    const targets = await Target.getTargets()
    console.log(`\n=== 标签页列表 (共 ${targets.targetInfos.length} 个) ===`)

    targets.targetInfos.forEach((target, index) => {
      console.log(`\n[${index + 1}] ${target.title || '无标题'}`)
      console.log(`    URL: ${target.url || 'about:blank'}`)
      console.log(`    类型: ${target.type}`)
      console.log(`    ID: ${target.targetId}`)
    })

    console.log('\n')
  } catch (error) {
    console.error('获取浏览器信息失败:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

/**
 * 执行命令
 */
export async function runCommand(command: string, args: string[]): Promise<void> {
  let client: CDP.Client | null = null
  try {
    client = await CDP({ port: DEBUG_PORT })

    switch (command) {
      case 'navigate':
        await handleNavigate(client, args)
        break
      case 'screenshot':
        await handleScreenshot(client, args)
        break
      case 'evaluate':
        await handleEvaluate(client, args)
        break
      default:
        console.error('命令有误')
        process.exit(1)
    }
  } catch (error) {
    console.error('执行命令失败:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
    }
  }
}

/**
 * 导航到指定 URL
 */
async function handleNavigate(client: CDP.Client, args: string[]): Promise<void> {
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
 * 截取屏幕截图
 */
async function handleScreenshot(client: CDP.Client, args: string[]): Promise<void> {
  const { Page } = client
  const outputPath = args[0] || 'screenshot.png'

  await Page.enable()
  const screenshot = await Page.captureScreenshot({ format: 'png' })

  // 这里可以保存截图文件
  console.log(`截图已捕获 (Base64 长度: ${screenshot.data.length})`)
  console.log(`输出路径: ${outputPath}`)
}

/**
 * 执行 JavaScript 代码
 */
async function handleEvaluate(client: CDP.Client, args: string[]): Promise<void> {
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
  } else {
    console.log('执行结果:', JSON.stringify(result.result.value, null, 2))
  }
}
