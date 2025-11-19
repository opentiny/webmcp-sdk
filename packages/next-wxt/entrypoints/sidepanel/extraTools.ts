import { z, type WebMcpServer } from '@opentiny/next-sdk'
import { getAccessibilityTree, extractTextFromTree, delay } from './utils/accessibilityTree'

export const useExtraTools = (server: WebMcpServer) => {
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

  // 注册获取无障碍树的工具
  server.registerTool(
    'getAccessibilityTree',
    {
      title: '获取浏览器页面文本信息、文档内容',
      description:
        '使用 Chrome DevTools Protocol (CDP) 获取当前页面的无障碍树，并提取其中的文本信息（包括按钮文本、链接文本、输入框值等），用于分析页面内容。只返回文本信息，不返回完整的树结构，以减少 token 使用。',
      inputSchema: {
        tabId: z.number().optional().describe('目标标签页 ID，如果不提供则使用当前活动标签页')
      }
    },
    async ({ tabId }) => {
      try {
        // 获取无障碍树
        const result = await getAccessibilityTree(tabId)
        // 提取文本信息
        const textItems = extractTextFromTree(result)

        // 构建文本摘要
        const textSummary = textItems.map((item) => {
          const roleInfo = item.role ? `[${item.role}] ` : ''
          return `${roleInfo}${item.text}`
        })

        // 按类型分组统计
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
        const maxTexts = 500 // 最多返回500条文本
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
        // 提供更友好的错误信息
        const errorMessage = error.message || '未知错误'
        let friendlyMessage = `获取无障碍树失败：${errorMessage}`

        // 根据错误类型提供解决建议
        if (errorMessage.includes('不支持无障碍树访问')) {
          friendlyMessage += '\n\n建议：请确保当前页面是普通的网页（如 https:// 或 http://），而不是系统页面。'
        } else if (errorMessage.includes('尚未完全加载')) {
          friendlyMessage += '\n\n建议：请等待页面完全加载后再试。'
        } else if (errorMessage.includes('另一个调试器')) {
          friendlyMessage += '\n\n建议：请关闭 Chrome DevTools 或其他调试工具后重试。'
        }

        return {
          content: [
            {
              type: 'text',
              text: friendlyMessage
            }
          ]
        }
      }
    }
  )
}
