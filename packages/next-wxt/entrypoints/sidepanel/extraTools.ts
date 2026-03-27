import { z, type WebMcpServer } from '@opentiny/next-sdk/core'
import { extractTextFromTree } from './utils/accessibilityTree'
import { snapshotManagerPool } from './utils/snapshotManagerPool'
import { getCurrentTabId, waitForTabLoad } from './utils/utils'
import { withToolAnimation } from './utils/toolAnimationWrapper'
import { executeVisualAction } from './visual'
import { executeSnapshotAction } from './accessibility'

export const useExtraTools = (server: WebMcpServer) => {
  // 打开新网址
  server.registerTool(
    'tabs-manager',
    {
      title: '标签页管理',
      description: '可以在当前环境中，打开新网址，切换标签页，关闭标签页,查询全部标签页等操作',
      inputSchema: {
        action: z
          .enum(['open', 'switch', 'close', 'switch-pre-tab', 'list-tabs'])
          .describe(
            '操作类型：open（打开新网址）、switch（切换标签页）、close（关闭标签页）、switch-pre-tab（切换上一个标签页）、list-tabs（查询全部标签页）'
          ),
        url: z.string().optional().describe('要打开的网址。在打开新网址时必须传入该参数。'),
        tabId: z.number().optional().describe('待操作的标签页 ID。在切换标签页时或关闭标签页时，必须传入该参数。')
      }
    },
    async ({ action, url, tabId }) => {
      if (action === 'open') {
        if (!url) return { content: [{ type: 'text', text: '打开新网址工具错误: 缺少网址参数' }] }
        // 判断 URL 是否匹配
        const isUrlMatch = (tabUrl: string | undefined, targetUrl: string): boolean => {
          if (!tabUrl) return false
          try {
            const current = new URL(tabUrl)
            const expected = new URL(targetUrl)
            // 完全匹配
            if (current.href === expected.href) {
              return true
            }
            // 匹配 origin 和 pathname（忽略 query 和 hash）
            return current.origin === expected.origin && current.pathname === expected.pathname
          } catch (error) {
            // 如果 URL 解析失败，使用字符串匹配
            return tabUrl.startsWith(targetUrl) || targetUrl.startsWith(tabUrl)
          }
        }

        // 查询所有标签页，查找是否已有匹配的 URL
        const allTabs = await browser.tabs.query({})
        const matchedTab = allTabs.find((tab) => isUrlMatch(tab.url, url))

        let openTabId: number

        if (matchedTab && matchedTab.id) {
          // 如果找到匹配的标签页，切换到该标签页
          openTabId = matchedTab.id
          try {
            await browser.tabs.update(openTabId, { active: true })
            // 如果标签页还在加载中，等待加载完成
            if (matchedTab.status !== 'complete') {
              await waitForTabLoad(openTabId)
            }
            return {
              content: [
                {
                  type: 'text',
                  text: `网址已在标签页中打开，已切换到该标签页, tabId: ${openTabId}`
                }
              ]
            }
          } catch (error: any) {
            // 如果切换失败，尝试创建新标签页
            console.warn(`切换到已存在的标签页失败: ${error.message}`)
            const createdTab = await browser.tabs.create({ url, active: true })
            openTabId = createdTab.id!
            await waitForTabLoad(openTabId)
            return {
              content: [
                {
                  type: 'text',
                  text: `已打开新网址, tabId: ${openTabId}`
                }
              ]
            }
          }
        } else {
          // 如果没有找到匹配的标签页，创建新标签页
          const createdTab = await browser.tabs.create({ url, active: true })
          openTabId = createdTab.id!
          // 等待页面加载完成
          await waitForTabLoad(openTabId)
          return {
            content: [
              {
                type: 'text',
                text: `已打开新网址, tabId: ${openTabId}`
              }
            ]
          }
        }
      } else if (action === 'switch') {
        if (!tabId) return { content: [{ type: 'text', text: '切换标签页工具错误: 缺少标签页 ID 参数' }] }

        try {
          await browser.tabs.update(tabId!, { active: true })
          return { content: [{ type: 'text', text: `已切换到标签页 ${tabId}` }] }
        } catch (error: any) {
          return { content: [{ type: 'text', text: `切换标签页工具错误: ${error.message}` }] }
        }
      } else if (action === 'close') {
        if (!tabId) return { content: [{ type: 'text', text: '关闭标签页工具错误: 缺少标签页 ID 参数' }] }

        try {
          await browser.tabs.remove(tabId!)
          return { content: [{ type: 'text', text: `已关闭标签页 ${tabId}` }] }
        } catch (error: any) {
          return { content: [{ type: 'text', text: `关闭标签页工具错误: ${error.message}` }] }
        }
      } else if (action === 'switch-pre-tab') {
        try {
          await sendRuntimeMessage('active-pre-tab', {}, 'side->bg')
          return { content: [{ type: 'text' as const, text: '已激活上一个标签页' }] }
        } catch (error: any) {
          return { content: [{ type: 'text' as const, text: `激活上一个标签页工具错误: ${error.message}` }] }
        }
      } else if (action === 'list-tabs') {
        // 列出所有标签页
        const allTabs = await browser.tabs.query({})
        return {
          content: [
            {
              type: 'text',
              text: `所有标签页为： ${JSON.stringify(
                allTabs.map((tab) => {
                  return { tabId: tab.id, url: tab.url, title: tab.title }
                })
              )}`
            }
          ]
        }
      }
    }
  )
  // 获取页面文本信息
  server.registerTool(
    'getPageInfomation',
    {
      title: '获取浏览器页面文本信息、文档、文章、wiki、博客、知识库内容，用来总结文章或知识库',
      description:
        '获取文本信息、文档、文章、wiki、博客、知识库，并提取其中的文本信息（包括按钮文本、链接文本、输入框值等），用于分析页面内容。只返回文本信息。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页')
      }
    },
    withToolAnimation('getPageInfomation', async ({ tabId }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())

      // 从连接池获取管理器（连接会被复用，不会频繁断开）
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        // 创建快照（verbose=false 只获取重要节点）
        const snapshot = await manager.createTextSnapshot(false)

        // 从快照中提取文本信息
        // 注意：这里我们需要将快照节点转换为文本提取器可用的格式
        const textItems = extractTextFromTree(snapshot.root)

        // 构建文本摘要
        const textSummary = textItems.map((item) => {
          const roleInfo = item.role ? `[${item.role}] ` : ''
          return `${roleInfo}${item.text}`
        })

        // 统计信息
        const stats = {
          total: textItems.length,
          byType: textItems.reduce(
            (acc, item) => {
              acc[item.type] = (acc[item.type] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          ),
          byRole: textItems.reduce(
            (acc, item) => {
              const role = item.role || 'unknown'
              acc[role] = (acc[role] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )
        }

        // 构建返回文本（限制文本数量，避免过长）
        const maxTexts = 500
        const displayTexts = textSummary.slice(0, maxTexts)
        const remainingCount = textSummary.length - maxTexts

        let resultText = `已成功提取页面文本信息，共 ${textItems.length} 条文本。\n\n`
        resultText += `统计信息：\n`
        resultText += `- 总计：${stats.total} 条\n`
        resultText += `- 按类型：${JSON.stringify(stats.byType, null, 2)}\n`
        resultText += `- 按角色：${JSON.stringify(stats.byRole, null, 2)}\n\n`

        if (remainingCount > 0) {
          resultText += `（仅显示前 ${maxTexts} 条，还有 ${remainingCount} 条未显示）\n\n`
        }

        resultText += `页面文本内容：\n\`\`\`\n${displayTexts.join('\n')}\n\`\`\``

        return { content: [{ type: 'text', text: resultText }] }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `获取页面文本信息失败：${errorMessage}`

        return { content: [{ type: 'text', text: friendlyMessage }] }
      } finally {
        // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )

  // Accessibility 工具：基于无障碍树和 UID 的页面操作工具集合（包含快照获取、点击、输入）
  server.registerTool(
    'accessibility',
    {
      title: 'Accessibility 工具',
      description: `基于无障碍树和 UID 的页面操作工具集合，支持获取页面快照和通过 UID 进行操作。
每个节点的 UID 格式为 "snapshotId_counter"，例如 "1_5"。
可用操作：
- snapshot: 获取页面的完整无障碍树结构快照，包含每个节点的唯一 UID。返回的快照可以用于后续的页面操作。
- click: 通过快照中的 UID 点击页面元素。需提供 uid。可选 button（left/right/middle）和 dblClick（是否双击）。点击前无需先 scroll，直接使用 click 即可。
- fill: 通过快照中的 UID 在输入框中输入文本。需提供 uid 和 text。可选 clearFirst（是否先清空输入框）。输入前无需先 scroll，直接使用 fill 即可。
- scroll: 【低优先级】仅在用户明确要求滚动时使用。例如用户说「向下滚动」「滚到页面底部」「把某区域滚入视图」等。若不提供 uid 则滚动整个页面；提供 uid 但不提供 x/y 则将元素滚动到视图中；提供 uid 和 x/y 则在元素内滚动到指定位置。可选 behavior（auto/smooth）。注意：不要为「方便点击/输入」而先调用 scroll，直接对目标元素使用 click 或 fill。
- copy: 从指定节点复制文本内容。需提供 uid。返回复制的文本内容（输入框返回 value，其他元素返回 textContent）。
- paste: 将文本粘贴到指定节点。需提供 uid 和 text。会自动聚焦并全选后输入文本。`,
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页'),
        action: z
          .enum(['snapshot', 'click', 'fill', 'scroll', 'copy', 'paste'])
          .describe(
            '操作类型：snapshot（获取快照）、click（点击）、fill（输入文本）、scroll（仅当用户明确要求滚动时使用）、copy（复制文本）、paste（粘贴文本）'
          ),
        uid: z
          .string()
          .optional()
          .describe(
            '快照中节点的 UID（格式：snapshotId_counter，如 "1_5"）。click、fill、copy、paste 操作必填；scroll 操作可选（不提供则滚动整个页面，且仅在用户明确要求滚动时使用 scroll）'
          ),
        button: z
          .enum(['left', 'right', 'middle'])
          .optional()
          .describe('鼠标按钮类型（仅用于 click 操作），默认为 left'),
        dblClick: z.boolean().optional().describe('是否双击（仅用于 click 操作），默认为 false'),
        text: z.string().optional().describe('要输入的文本（用于 fill 和 paste 操作）'),
        clearFirst: z.boolean().optional().describe('是否先清空输入框（仅用于 fill 操作），默认为 true'),
        x: z.number().optional().describe('水平滚动位置（仅用于 scroll 操作）'),
        y: z.number().optional().describe('垂直滚动位置（仅用于 scroll 操作）'),
        behavior: z.enum(['auto', 'smooth']).optional().describe('滚动行为（仅用于 scroll 操作），默认为 auto')
      }
    },
    withToolAnimation('accessibility', async (params: any) => {
      return await executeSnapshotAction(params)
    })
  )

  // Visual 工具：基于视觉截图和坐标的页面操作工具，提供给视觉模型使用
  server.registerTool(
    'visual',
    {
      title: 'Visual Control',
      description: `基于视觉截图和坐标的页面操作工具，支持通过截图坐标进行点击、输入等操作。适用于视觉模型。

⚠️ 坐标系统规范（纯视觉定位）：
1. 坐标基准：基于压缩后的截图（最大宽度 1024px），左上角为 [0, 0]，x 向右增加，y 向下增加
2. 坐标格式：像素坐标（整数），相对于压缩后的截图尺寸
3. 坐标精度：所有点击坐标必须是目标元素的**视觉中心点**
   - 对于按钮、链接：计算元素边界框的中心位置
   - 对于文本：点击文字的中心区域，不要点击起始位置
   - 对于小元素：宁可偏向中心，避免靠近边缘
4. 重要：先观察截图的实际尺寸，然后基于该尺寸计算坐标

📐 坐标计算示例：
- 如果截图是 1024×768，要点击中心：coordinate = [512, 384]
- 如果按钮在截图中的位置是左上(100,200)到右下(300,250)，中心点：coordinate = [200, 225]
可用操作：
- left_click: 在指定坐标点击左键。coordinate [x, y] 必须是目标元素的中心点。
- right_click: 在指定坐标点击右键。coordinate [x, y] 必须是目标元素的中心点。
- middle_click: 在指定坐标点击中键。coordinate [x, y] 必须是目标元素的中心点。
- double_click: 在指定坐标双击。coordinate [x, y] 必须是目标元素的中心点。
- type: 在输入框中输入文本。需提供 text。如果提供 coordinate，则先点击该坐标（必须是输入框的中心点）再输入。可选 press_enter, delete_existing_text。
- key: 按下特定按键。需提供 text (按键名称，如 "Enter", "Escape")。
- screenshot: 捕获当前页面截图，如未获取过截图，则先获取截图。
- scroll: 滚动页面。需提供 pixels (正数向下，负数向上)。
- cursor_position: 获取当前鼠标位置。
- history: 浏览器历史记录操作。需提供 arg ("back" 或 "forward")。
- history_back: 后退到上一页。
- history_forward: 前进到下一页。`,
      inputSchema: {
        action: z
          .enum([
            'left_click',
            'right_click',
            'middle_click',
            'double_click',
            'type',
            'key',
            'screenshot',
            'cursor_position',
            'scroll',
            'history',
            'history_back',
            'history_forward'
          ])
          .describe('操作类型'),
        coordinate: z.array(z.number()).optional().describe('坐标 [x, y] (点击操作必填)'),
        text: z.string().optional().describe('输入文本 (type 或 key 操作必填)'),
        arg: z.string().optional().describe('操作参数 (history 或 key 操作必填)'),
        pixels: z.number().optional().describe('滚动像素 (正值向下，负值向上)'),
        press_enter: z.boolean().optional().describe('输入后是否回车 (type 操作可选)'),
        delete_existing_text: z.boolean().optional().describe('输入前是否清空 (type 操作可选)'),
        time: z.number().optional().describe('等待时间（秒，仅用于 wait 操作）')
      }
    },
    withToolAnimation('visual', async (params: any) => {
      // 获取当前标签页
      const currentTabId = await getCurrentTabId()
      // 从连接池获取管理器
      const manager = await snapshotManagerPool.getManager(currentTabId)

      try {
        const page = manager.getPage()
        if (!page) {
          throw new Error('页面未连接，请先确保标签页已加载')
        }

        return await executeVisualAction({
          page,
          ...params
        })
      } catch (error: any) {
        return { content: [{ type: 'text' as const, text: `Visual 工具错误: ${error.message}` }] }
      } finally {
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )
}
