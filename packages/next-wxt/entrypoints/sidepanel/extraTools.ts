// 工具注册
// 使用新的快照管理器重构，参考 chrome-devtools-mcp 的技术方案

import { z, type WebMcpServer } from '@opentiny/next-sdk'
import { extractTextFromTree } from './utils/accessibilityTree'
import { SnapshotManager } from './utils/snapshotManager'
import { formatSnapshot } from './utils/snapshotFormatter'
import { clickNodeByUid, typeIntoNodeByUid, selectOptionByUid } from './utils/snapshotOperations'

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 获取当前活动标签页 ID
async function getCurrentTabId(): Promise<number> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  if (!tabs[0]?.id) {
    throw new Error('无法获取当前活动标签页')
  }
  return tabs[0].id
}

export const useExtraTools = (server: WebMcpServer) => {
  // 打开新网址
  server.registerTool(
    'openUrl',
    {
      title: '打开新网址',
      description: '打开新网址',
      inputSchema: {
        url: z.string().describe('要打开的网址')
      }
    },
    async ({ url }) => {
      const createdTab = await browser.tabs.create({ url })
      await delay(1000)
      return { content: [{ type: 'text', text: `打开网址成功, tabId: ${createdTab.id}` }] }
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
    async ({ tabId }) => {
      const manager = new SnapshotManager()
      try {
        // 获取当前标签页
        const currentTabId = tabId || (await getCurrentTabId())

        // 连接到标签页
        await manager.connect(currentTabId)

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

        return {
          content: [
            {
              type: 'text',
              text: resultText
            }
          ]
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `获取页面文本信息失败：${errorMessage}`

        return {
          content: [
            {
              type: 'text',
              text: friendlyMessage
            }
          ]
        }
      } finally {
        await manager.disconnect()
      }
    }
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
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页'),
        verbose: z.boolean().optional().describe('是否包含所有节点（false 时只包含重要节点），默认为 false')
      }
    },
    async ({ tabId, verbose = false }) => {
      const manager = new SnapshotManager()
      try {
        // 获取当前标签页
        const currentTabId = tabId || (await getCurrentTabId())

        // 连接到标签页
        await manager.connect(currentTabId)

        // 创建快照
        const snapshot = await manager.createTextSnapshot(verbose)

        console.log(snapshot, 'snapshot')

        // 格式化快照为文本
        const formattedSnapshot = formatSnapshot(snapshot)

        // 统计信息
        const actionableNodes = Array.from(snapshot.idToNode.values()).filter(
          (n) => n.backendNodeId || n.backendDOMNodeId
        ).length

        let resultText = `已成功获取页面无障碍树快照（快照 ID: ${snapshot.snapshotId}）。\n\n`
        resultText += `统计信息：\n`
        resultText += `- 总节点数：${snapshot.idToNode.size}\n`
        resultText += `- 可操作节点（有 backendNodeId）：${actionableNodes}\n`
        resultText += `- 详细模式：${verbose ? '是' : '否'}\n\n`
        resultText += `快照内容：\n\`\`\`\n${formattedSnapshot}\n\`\`\`\n\n`
        resultText += `提示：您可以使用快照中每个节点的 UID（如 "1_5"）进行后续操作，例如点击、输入文本等。`

        return {
          content: [
            {
              type: 'text',
              text: resultText
            }
          ]
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        const friendlyMessage = `获取快照失败：${errorMessage}`

        return {
          content: [
            {
              type: 'text',
              text: friendlyMessage
            }
          ]
        }
      } finally {
        await manager.disconnect()
      }
    }
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
    async ({ tabId, uid, button, dblClick }) => {
      const manager = new SnapshotManager()
      try {
        // 获取当前标签页
        const currentTabId = tabId || (await getCurrentTabId())

        // 连接到标签页
        await manager.connect(currentTabId)

        // 创建快照（如果当前没有快照）
        const snapshot = manager.getSnapshot()
        if (!snapshot) {
          await manager.createTextSnapshot(false)
        }

        // 执行点击操作
        await clickNodeByUid(manager, uid, {
          button: button || 'left',
          clickCount: dblClick ? 2 : 1
        })

        // 操作后自动获取新快照（参考 chrome-devtools-mcp）
        await manager.createTextSnapshot(false)

        return {
          content: [
            {
              type: 'text',
              text: `成功${dblClick ? '双击' : '点击'}节点 (UID: ${uid})。已自动获取新快照。`
            }
          ]
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        let friendlyMessage = `点击节点失败：${errorMessage}`

        // 如果是快照过期错误，提供提示
        if (errorMessage.includes('快照中未找到节点') || errorMessage.includes('stale snapshot')) {
          friendlyMessage += '\n\n提示：请先使用 takeSnapshot 获取最新的快照，然后使用快照中的 UID 进行操作。'
        }

        return {
          content: [
            {
              type: 'text',
              text: friendlyMessage
            }
          ]
        }
      } finally {
        await manager.disconnect()
      }
    }
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
    async ({ tabId, uid, text, clearFirst = true }) => {
      const manager = new SnapshotManager()
      try {
        // 获取当前标签页
        const currentTabId = tabId || (await getCurrentTabId())

        // 连接到标签页
        await manager.connect(currentTabId)

        // 创建快照（如果当前没有快照）
        const snapshot = manager.getSnapshot()
        if (!snapshot) {
          await manager.createTextSnapshot(false)
        }

        // 执行输入操作
        await typeIntoNodeByUid(manager, uid, text, { clearFirst })

        // 操作后自动获取新快照
        await manager.createTextSnapshot(false)

        return {
          content: [
            {
              type: 'text',
              text: `成功在节点 (UID: ${uid}) 中输入文本: "${text}"。已自动获取新快照。`
            }
          ]
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        let friendlyMessage = `输入文本失败：${errorMessage}`

        if (errorMessage.includes('快照中未找到节点') || errorMessage.includes('stale snapshot')) {
          friendlyMessage += '\n\n提示：请先使用 takeSnapshot 获取最新的快照，然后使用快照中的 UID 进行操作。'
        }

        return {
          content: [
            {
              type: 'text',
              text: friendlyMessage
            }
          ]
        }
      } finally {
        await manager.disconnect()
      }
    }
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
    async ({ tabId, uid, optionValue }) => {
      const manager = new SnapshotManager()
      try {
        // 获取当前标签页
        const currentTabId = tabId || (await getCurrentTabId())

        // 连接到标签页
        await manager.connect(currentTabId)

        // 创建快照（如果当前没有快照）
        const snapshot = manager.getSnapshot()
        if (!snapshot) {
          await manager.createTextSnapshot(false)
        }

        // 执行选择操作
        await selectOptionByUid(manager, uid, optionValue)

        // 操作后自动获取新快照
        await manager.createTextSnapshot(false)

        return {
          content: [
            {
              type: 'text',
              text: `成功在下拉框 (UID: ${uid}) 中选择选项: ${optionValue}。已自动获取新快照。`
            }
          ]
        }
      } catch (error: any) {
        const errorMessage = error.message || '未知错误'
        let friendlyMessage = `选择选项失败：${errorMessage}`

        if (errorMessage.includes('快照中未找到节点') || errorMessage.includes('stale snapshot')) {
          friendlyMessage += '\n\n提示：请先使用 takeSnapshot 获取最新的快照，然后使用快照中的 UID 进行操作。'
        }

        return {
          content: [
            {
              type: 'text',
              text: friendlyMessage
            }
          ]
        }
      } finally {
        await manager.disconnect()
      }
    }
  )
}
