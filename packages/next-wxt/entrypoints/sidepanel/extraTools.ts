import { z, type WebMcpServer } from '@opentiny/next-sdk'
import { extractTextFromTree } from './utils/accessibilityTree'
import { snapshotManagerPool } from './utils/snapshotManagerPool'
import { formatSnapshot } from './utils/snapshotFormatter'
import { clickNodeByUid, typeIntoNodeByUid, selectOptionByUid } from './utils/snapshotOperations'
import {
  getCurrentTabId,
  waitForTabLoad,
  checkSnapshotExists,
  formatSnapshotResult,
  getLatestSnapshotAfterOperation
} from './utils/utils'
import { withToolAnimation } from './utils/toolAnimationWrapper'
import { useAutoScreenshot } from './useAutoScreenshot'

// 初始化自动截图功能
const { captureCurrentTab } = useAutoScreenshot()

export const useExtraTools = (server: WebMcpServer) => {
  // 打开新网址
  server.registerTool(
    'openUrl',
    {
      title: '打开新网址',
      description: '打开新网址，如果该网址已经在标签页中打开，则切换到该标签页；否则创建新标签页',
      inputSchema: {
        url: z.string().describe('要打开的网址')
      }
    },
    async ({ url }) => {
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

      let tabId: number

      if (matchedTab && matchedTab.id) {
        // 如果找到匹配的标签页，切换到该标签页
        tabId = matchedTab.id
        try {
          await browser.tabs.update(tabId, { active: true })
          // 如果标签页还在加载中，等待加载完成
          if (matchedTab.status !== 'complete') {
            await waitForTabLoad(tabId)
          }
          return {
            content: [
              {
                type: 'text',
                text: `网址已在标签页中打开，已切换到该标签页, tabId: ${tabId}`
              }
            ]
          }
        } catch (error: any) {
          // 如果切换失败，尝试创建新标签页
          console.warn(`切换到已存在的标签页失败: ${error.message}`)
          const createdTab = await browser.tabs.create({ url, active: true })
          tabId = createdTab.id!
          await waitForTabLoad(tabId)
          return {
            content: [
              {
                type: 'text',
                text: `已打开新网址, tabId: ${tabId}`
              }
            ]
          }
        }
      } else {
        // 如果没有找到匹配的标签页，创建新标签页
        const createdTab = await browser.tabs.create({ url, active: true })
        tabId = createdTab.id!
        // 等待页面加载完成
        await waitForTabLoad(tabId)
        return {
          content: [
            {
              type: 'text',
              text: `已打开新网址, tabId: ${tabId}`
            }
          ]
        }
      }
    }
  )

  // 滚动页面
  server.registerTool(
    'scrollPage',
    {
      title: '向下滚动浏览器页面',
      description: '向下滚动浏览器页面',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页')
      }
    },
    withToolAnimation('scrollPage', async ({ tabId }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())

      // 从连接池获取管理器（连接会被复用，不会频繁断开）
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        await manager.scrollPage()

        return { content: [{ type: 'text', text: '滚动结束' }] }
      } catch (error: any) {
        return { content: [{ type: 'text', text: '滚动异常' }] }
      } finally {
        // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
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

  // 获取无障碍树快照（包含 UID）
  // 参考 chrome-devtools-mcp 的 take_snapshot 工具
  server.registerTool(
    'takeSnapshot',
    {
      title: '获取浏览器页面无障碍树快照（包含 UID）',
      description:
        '获取页面的完整无障碍树结构，包含每个节点的唯一 UID。返回的快照可以用于后续的页面操作（如点击、输入等）。每个节点的 UID 格式为 "snapshotId_counter"，例如 "1_5"。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页')
      }
    },
    withToolAnimation('takeSnapshot', async ({ tabId }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())

      // 从连接池获取管理器（连接会被复用，不会频繁断开）
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        // 创建快照
        const snapshot = await manager.createTextSnapshot(false)

        // 格式化快照为文本
        const formattedSnapshot = formatSnapshot(snapshot)

        // 使用公共函数格式化结果
        const resultText = formatSnapshotResult(snapshot, formattedSnapshot, {
          verbose: false,
          includeUidExample: true
        })

        return { content: [{ type: 'text', text: resultText }] }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `获取快照失败：${errorMessage}`

        return {
          content: [{ type: 'text', text: friendlyMessage }]
        }
      } finally {
        // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )

  // 点击节点（通过 UID）
  // 参考 chrome-devtools-mcp 的 click 工具
  server.registerTool(
    'click',
    {
      title: '点击页面元素',
      description: '通过快照中的 UID 点击页面元素。请先使用 takeSnapshot 获取快照，然后使用快照中的 UID 进行操作。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页'),
        uid: z.string().describe('快照中节点的 UID（格式：snapshotId_counter，如 "1_5"）'),
        button: z.enum(['left', 'right', 'middle']).optional().describe('鼠标按钮类型，默认为 left'),
        dblClick: z.boolean().optional().describe('是否双击，默认为 false')
      }
    },
    withToolAnimation('click', async ({ tabId, uid, button, dblClick }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())
      // 从连接池获取管理器（连接会被复用，不会频繁断开）
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        // 检查是否有快照
        const snapshotCheck = checkSnapshotExists(manager)
        if (snapshotCheck) {
          return snapshotCheck
        }

        // 执行点击操作
        await clickNodeByUid(manager, uid, {
          button: button || 'left',
          clickCount: dblClick ? 2 : 1
        })

        // 获取操作后的最新快照并返回
        return await getLatestSnapshotAfterOperation(manager, `成功${dblClick ? '双击' : '点击'}节点 (UID: ${uid})。`)
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `点击节点失败：${errorMessage}`

        return { content: [{ type: 'text', text: friendlyMessage }] }
      } finally {
        // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )

  // 输入文本（通过 UID）
  // 参考 chrome-devtools-mcp 的 fill 工具
  server.registerTool(
    'fill',
    {
      title: '在输入框中输入文本',
      description:
        '通过快照中的 UID 在输入框中输入文本。请先使用 takeSnapshot 获取快照，然后使用快照中的 UID 进行操作。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页'),
        uid: z.string().describe('快照中节点的 UID（格式：snapshotId_counter，如 "1_5"）'),
        text: z.string().describe('要输入的文本'),
        clearFirst: z.boolean().optional().describe('是否先清空输入框，默认为 true')
      }
    },
    withToolAnimation('fill', async ({ tabId, uid, text, clearFirst = true }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())

      // 从连接池获取管理器（连接会被复用，不会频繁断开）
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        // 检查是否有快照
        const snapshotCheck = checkSnapshotExists(manager)
        if (snapshotCheck) {
          return snapshotCheck
        }

        // 执行输入操作
        await typeIntoNodeByUid(manager, uid, text, { clearFirst })

        // 获取操作后的最新快照并返回
        return await getLatestSnapshotAfterOperation(manager, `成功在节点 (UID: ${uid}) 中输入文本: "${text}"。`)
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `输入文本失败：${errorMessage}`

        return { content: [{ type: 'text', text: friendlyMessage }] }
      } finally {
        // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )

  // 选择下拉选项（通过 UID）
  server.registerTool(
    'selectOption',
    {
      title: '在下拉框中选择选项',
      description:
        '通过快照中的 UID 在下拉框中选择选项。请先使用 takeSnapshot 获取快照，然后使用快照中的 UID 进行操作。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页'),
        uid: z.string().describe('快照中下拉框节点的 UID（格式：snapshotId_counter，如 "1_5"）'),
        optionValue: z.union([z.string(), z.number()]).describe('选项值（字符串）或索引（数字）')
      }
    },
    withToolAnimation('selectOption', async ({ tabId, uid, optionValue }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())

      // 从连接池获取管理器（连接会被复用，不会频繁断开）
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        // 检查是否有快照
        const snapshotCheck = checkSnapshotExists(manager)
        if (snapshotCheck) {
          return snapshotCheck
        }

        // 执行选择操作
        await selectOptionByUid(manager, uid, optionValue)

        // 获取操作后的最新快照并返回
        return await getLatestSnapshotAfterOperation(manager, `成功在下拉框 (UID: ${uid}) 中选择选项: ${optionValue}。`)
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `选择选项失败：${errorMessage}`

        return { content: [{ type: 'text', text: friendlyMessage }] }
      } finally {
        // 释放连接引用（连接池会管理连接生命周期，不会立即断开）
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )

  // 根据坐标点击页面元素
  server.registerTool(
    'clickByCoordinate',
    {
      title: '根据坐标点击页面，需要先获取页面截图',
      description:
        '根据 x, y 坐标点击页面上的元素。坐标系统：左上角为 (0, 0)，x 向右增加，y 向下增加。通常与 captureScreenshot 配合使用，先截图分析再点击。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页'),
        x: z.number().describe('点击位置的 x 坐标（像素）'),
        y: z.number().describe('点击位置的 y 坐标（像素）'),
        button: z.enum(['left', 'right', 'middle']).optional().describe('鼠标按钮类型，默认为 left'),
        clickCount: z.number().optional().describe('点击次数，默认为 1（单击），2 为双击')
      }
    },
    withToolAnimation('clickByCoordinate', async ({ tabId, x, y, button = 'left', clickCount = 1 }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())

      // 从连接池获取管理器
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        const page = manager.getPage()
        if (!page) {
          throw new Error('页面未连接，请先确保标签页已加载')
        }

        // 获取截图工具实例，用于坐标转换
        const { convertCompressedCoordinateToOriginal } = useAutoScreenshot()

        // 将 AI 给出的压缩截图坐标转换为原始页面坐标
        // AI 看到的是压缩后的截图（最大宽度512px），需要转换回原始页面坐标
        const originalCoords = convertCompressedCoordinateToOriginal(x, y)
        const finalX = originalCoords.x
        const finalY = originalCoords.y

        console.log(`[clickByCoordinate] 坐标转换: AI给出的坐标 (${x}, ${y}) -> 原始页面坐标 (${finalX}, ${finalY})`)

        // 使用 Puppeteer 的 mouse API 点击转换后的坐标
        await page.mouse.click(finalX, finalY, {
          button: button as 'left' | 'right' | 'middle',
          clickCount
        })

        // 等待页面响应（给页面一些时间处理点击事件）
        await new Promise((resolve) => setTimeout(resolve, 500))

        const clickType = clickCount === 2 ? '双击' : '点击'
        return {
          content: [
            {
              type: 'text',
              text: `成功${clickType}坐标 (${finalX}, ${finalY})（原始坐标：${x}, ${y}），使用 ${button} 按钮`
            }
          ]
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `坐标点击失败：${errorMessage}`

        return { content: [{ type: 'text', text: friendlyMessage }] }
      } finally {
        // 释放连接引用
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )

  // 根据坐标在输入框中输入文本
  server.registerTool(
    'typeByCoordinate',
    {
      title: '根据坐标输入文本',
      description:
        '先点击指定坐标位置（通常是输入框），然后输入文本。适用于需要先聚焦输入框再输入的场景。通常与 captureScreenshot 配合使用。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页'),
        x: z.number().describe('输入框的 x 坐标（像素）'),
        y: z.number().describe('输入框的 y 坐标（像素）'),
        text: z.string().describe('要输入的文本内容'),
        clearFirst: z.boolean().optional().describe('是否先清空输入框，默认为 true')
      }
    },
    withToolAnimation('typeByCoordinate', async ({ tabId, x, y, text, clearFirst = true }) => {
      // 获取当前标签页
      const currentTabId = tabId || (await getCurrentTabId())

      // 从连接池获取管理器
      const manager = await snapshotManagerPool.getManager(currentTabId)
      try {
        const page = manager.getPage()
        if (!page) {
          throw new Error('页面未连接，请先确保标签页已加载')
        }

        // 获取截图工具实例，用于坐标转换
        const { convertCompressedCoordinateToOriginal } = useAutoScreenshot()

        // 将 AI 给出的压缩截图坐标转换为原始页面坐标
        const originalCoords = convertCompressedCoordinateToOriginal(x, y)
        const finalX = originalCoords.x
        const finalY = originalCoords.y

        console.log(`[typeByCoordinate] 坐标转换: AI给出的坐标 (${x}, ${y}) -> 原始页面坐标 (${finalX}, ${finalY})`)

        // 先点击转换后的坐标位置以聚焦输入框
        await page.mouse.click(finalX, finalY)
        await new Promise((resolve) => setTimeout(resolve, 200))

        // 如果需要清空，先全选再删除
        if (clearFirst) {
          // 使用 Ctrl+A (Windows/Linux) 或 Cmd+A (Mac) 全选
          const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
          await page.keyboard.down(modifier)
          await page.keyboard.press('KeyA')
          await page.keyboard.up(modifier)
          await page.keyboard.press('Backspace')
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        // 输入文本
        await page.keyboard.type(text, { delay: 50 }) // 每个字符间隔 50ms，更自然

        // 等待输入完成
        await new Promise((resolve) => setTimeout(resolve, 300))

        return {
          content: [
            {
              type: 'text',
              text: `成功在坐标 (${finalX}, ${finalY})（原始坐标：${x}, ${y}）处输入文本: "${text}"${clearFirst ? '（已清空原内容）' : ''}`
            }
          ]
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `坐标输入失败：${errorMessage}`

        return { content: [{ type: 'text', text: friendlyMessage }] }
      } finally {
        // 释放连接引用
        await snapshotManagerPool.releaseManager(currentTabId)
      }
    })
  )

  // Computer 工具 (Fara-7B 专用)
  server.registerTool(
    'computer',
    {
      title: 'Computer Use',
      description: `执行计算机操作，如点击、输入、截图等。支持 Fara-7B 的 computer 工具调用格式。
坐标系统：以压缩后的截图为基准，最大宽度通常为 512px。左上角为 [0, 0]，x 向右增加，y 向下增加。
可用操作：
- left_click: 在指定坐标点击左键。需提供 coordinate [x, y]。
- right_click: 在指定坐标点击右键。需提供 coordinate [x, y]。
- middle_click: 在指定坐标点击中键。需提供 coordinate [x, y]。
- double_click: 在指定坐标双击。需提供 coordinate [x, y]。
- type: 在指定坐标（可选）输入文本。需提供 text。可选 coordinate, press_enter, delete_existing_text。
- key: 按下特定按键。需提供 text (按键名称，如 "Enter", "Escape")。
- screenshot: 捕获当前页面截图。
- scroll: 滚动页面。需提供 pixels (正数向下，负数向上)。
- wait: 等待一段时间，确保页面加载。需提供 time (秒)。
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
            'wait',
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
    withToolAnimation(
      'computer',
      async ({ action, coordinate, text, arg, pixels, press_enter, delete_existing_text, time }) => {
        // 获取当前标签页
        const currentTabId = await getCurrentTabId()
        // 从连接池获取管理器
        const manager = await snapshotManagerPool.getManager(currentTabId)

        try {
          const page = manager.getPage()
          if (!page) {
            throw new Error('页面未连接，请先确保标签页已加载')
          }

          // 执行操作
          let mwMessage = ''

          // 获取截图工具实例
          const { convertCompressedCoordinateToOriginal, captureCurrentTab: captureInstance } = useAutoScreenshot()
          // 兼容 captureCurrentTab 可能在外部定义的情况，优先使用 userAutoScreenshot 返回的
          const captureFn = captureInstance || captureCurrentTab

          // 1. 处理点击类操作
          if (['left_click', 'right_click', 'middle_click', 'double_click'].includes(action)) {
            if (!coordinate || coordinate.length !== 2) {
              throw new Error(`操作 ${action} 需要有效的坐标 [x, y]`)
            }

            const [x, y] = coordinate
            const originalCoords = convertCompressedCoordinateToOriginal(x, y)
            const finalX = originalCoords.x
            const finalY = originalCoords.y

            console.log(`[computer] ${action} 坐标转换: AI(${x}, ${y}) -> 原始(${finalX}, ${finalY})`)

            const clickOptions: any = {}
            if (action === 'right_click') clickOptions.button = 'right'
            if (action === 'middle_click') clickOptions.button = 'middle'
            if (action === 'double_click') clickOptions.clickCount = 2

            await page.mouse.click(finalX, finalY, clickOptions)
            mwMessage = `成功执行 ${action} 于 [${finalX}, ${finalY}]`
          } else if (action === 'type') {
            if (!text) throw new Error('操作 type 需要文本')

            if (coordinate && coordinate.length === 2) {
              const [x, y] = coordinate
              const originalCoords = convertCompressedCoordinateToOriginal(x, y)
              console.log(
                `[computer] type with click at: AI(${x}, ${y}) -> 原始(${originalCoords.x}, ${originalCoords.y})`
              )
              await page.mouse.click(originalCoords.x, originalCoords.y)
              await new Promise((r) => setTimeout(r, 200))
            }

            const isMac = navigator.userAgent.includes('Mac')
            const modifier = isMac ? 'Meta' : 'Control'
            await page.keyboard.down(modifier)
            await page.keyboard.press('KeyA')
            await page.keyboard.up(modifier)
            await page.keyboard.press('Backspace')
            await new Promise((r) => setTimeout(r, 100))

            await page.keyboard.type(text)

            if (press_enter) {
              await page.keyboard.press('Enter')
            }

            mwMessage = `已成功输入: "${text}"`
          } else if (action === 'key') {
            const keyName = (arg || text) as any
            if (!keyName) throw new Error('Action key requires key name (in arg or text)')
            await page.keyboard.press(keyName)
            mwMessage = `已成功按下: ${keyName}`
          } else if (action === 'screenshot') {
            mwMessage = '已成功截图'
          } else if (action === 'scroll') {
            const scrollPixels = pixels || 500
            await page.evaluate((y) => window.scrollBy(0, y), scrollPixels)
            mwMessage = `已成功滚动 ${scrollPixels > 0 ? '向下' : '向上'} ${Math.abs(scrollPixels)} 像素`
          } else if (action === 'wait') {
            const waitTime = time || 3
            await new Promise((resolve) => setTimeout(resolve, waitTime * 1000))
            mwMessage = `已成功等待 ${waitTime} 秒`
          } else if (action === 'cursor_position') {
            // 获取当前鼠标位置（如果不支持记录，则返回一个提示信息）
            // 注意：Puppeteer 本身不存储当前鼠标位置，除非我们自己记录
            // 这里返回一个提示信息
            mwMessage = '当前坐标系统基于截图，请在截图中观察鼠标位置（如果可见）。'
          } else if (action === 'history' || action === 'history_back' || action === 'history_forward') {
            const historyArg =
              action === 'history_back' ? 'back' : action === 'history_forward' ? 'forward' : arg || text
            try {
              if (historyArg === 'back') {
                await page.goBack()
                mwMessage = '已成功后退到上一页'
              } else if (historyArg === 'forward') {
                await page.goForward()
                mwMessage = '已成功前进到下一页'
              } else {
                throw new Error('history 操作需要有效的参数 "back" 或 "forward"')
              }
            } catch (err: any) {
              if (err.message?.includes('History entry to navigate to not found')) {
                mwMessage = `无法${historyArg === 'back' ? '后退' : '前进'}：没有更多的历史记录。`
              } else {
                throw err
              }
            }
          } else {
            mwMessage = `操作 ${action} 执行成功`
          }

          // 捕获新截图作为反馈
          // 等待一段时间，保证输入或者切换面板可以完全展示出来再进行截屏
          await new Promise((resolve) => setTimeout(resolve, 2000))
          const screenshotDataUrl = await captureFn()
          // 提取 base64 (AgentModelProvider 可能期望纯 base64 或者 data url，这里保持 data url format 方便调试，或者 trim prefix)
          // 之前我们在 App.vue 用 trim prefix. 这里我们在 AgentModelProvider 直接用 string.
          // 为了安全起见，这里返回 raw base64 (without prefix)
          const base64Match = screenshotDataUrl.match(/^data:image\/\w+;base64,(.+)$/)
          const screenshotBase64 = base64Match ? base64Match[1] : screenshotDataUrl

          return {
            content: [{ type: 'text', text: mwMessage }],
            screenshot: screenshotBase64
          }
        } catch (error: any) {
          return { content: [{ type: 'text', text: `Computer 工具错误: ${error.message}` }] }
        } finally {
          await snapshotManagerPool.releaseManager(currentTabId)
        }
      }
    )
  )
}
