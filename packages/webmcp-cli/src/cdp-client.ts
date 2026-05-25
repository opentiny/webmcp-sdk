import { connectCdp } from './connect-cdp.js'
import { DEBUG_PORT, getDebugListUrl } from './constants.js'

interface TargetInfo {
  id: string
  title: string
  url: string
  type: string
}

/**
 * 通过 HTTP 获取标签页列表（不依赖 Target 域）
 */
async function fetchTargetList(): Promise<TargetInfo[]> {
  const response = await fetch(getDebugListUrl(DEBUG_PORT))
  if (!response.ok) {
    throw new Error(`无法获取标签页列表: HTTP ${response.status}`)
  }
  const list = (await response.json()) as Array<{
    id: string
    title: string
    url: string
    type: string
  }>
  return list.map((item) => ({
    id: item.id,
    title: item.title,
    url: item.url,
    type: item.type
  }))
}

/**
 * 查询浏览器当前情况
 */
export async function listBrowserInfo(): Promise<void> {
  let client: Awaited<ReturnType<typeof connectCdp>> | null = null
  try {
    client = await connectCdp()
    const { Browser } = client

    const version = await Browser.getVersion()
    console.log('\n=== 浏览器信息 ===')
    console.log(`名称: ${version.product}`)
    console.log(`协议版本: ${version.protocolVersion}`)
    console.log(`User-Agent: ${version.userAgent}`)
    console.log(`JS 版本: ${version.jsVersion || 'N/A'}`)

    const targets = await fetchTargetList()
    const pages = targets.filter((t) => t.type === 'page')
    const displayTargets = pages.length > 0 ? pages : targets

    console.log(`\n=== 标签页列表 (共 ${displayTargets.length} 个) ===`)

    displayTargets.forEach((target, index) => {
      console.log(`\n[${index + 1}] ${target.title || '无标题'}`)
      console.log(`    URL: ${target.url || 'about:blank'}`)
      console.log(`    类型: ${target.type}`)
      console.log(`    ID: ${target.id}`)
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
