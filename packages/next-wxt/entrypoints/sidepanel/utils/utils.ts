import { SnapshotManager, type Snapshot } from './snapshotManager'
import { formatSnapshot } from './snapshotFormatter'

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 获取当前活动标签页 ID
export const getCurrentTabId = async (): Promise<number> => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  if (!tabs[0]?.id) {
    throw new Error('无法获取当前活动标签页')
  }
  return tabs[0].id
}

/**
 * 等待标签页加载完成
 * @param tabId 标签页 ID
 * @param timeout 超时时间（毫秒），默认 30 秒
 * @returns Promise<void>
 */
export const waitForTabLoad = (tabId: number, timeout = 30000): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 设置超时
    const timeoutId = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener)
      reject(new Error(`等待标签页 ${tabId} 加载超时`))
    }, timeout)

    // 监听标签页更新事件
    const listener: Parameters<typeof browser.tabs.onUpdated.addListener>[0] = (updatedTabId, changeInfo, tab) => {
      // 只处理目标标签页
      if (updatedTabId !== tabId) return

      // 检查状态是否为 'complete'（页面加载完成）
      if (changeInfo.status === 'complete') {
        clearTimeout(timeoutId)
        browser.tabs.onUpdated.removeListener(listener)
        resolve()
      }
    }

    // 添加监听器
    browser.tabs.onUpdated.addListener(listener)

    // 立即检查一次，可能标签页已经加载完成
    browser.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === 'complete') {
          clearTimeout(timeoutId)
          browser.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      })
      .catch(() => {
        // 如果获取失败，继续等待监听器触发
      })
  })
}

/**
 * 执行操作并等待事件
 */
export const waitForEventsAfterAction = async (page: any, action: () => Promise<void>): Promise<void> => {
  try {
    // 执行操作
    await action()
  } catch (error: any) {
    throw new Error(`操作后等待事件失败: ${error.message}`)
  }
}

/**
 * 检查快照是否存在，如果不存在则返回错误响应
 */
export function checkSnapshotExists(manager: SnapshotManager): { content: Array<{ type: 'text'; text: string }> } | null {
  const currentSnapshot = manager.getSnapshot()
  if (!currentSnapshot) {
    return {
      content: [
        {
          type: 'text' as const,
          text: '当前没有快照，请先使用 takeSnapshot 获取快照，然后使用快照中的 UID 进行操作。'
        }
      ]
    }
  }
  return null
}

/**
 * 格式化快照结果为文本
 * @param snapshot 快照对象
 * @param formattedSnapshot 格式化后的快照文本
 * @param options 选项
 * @returns 格式化的结果文本
 */
export function formatSnapshotResult(
  snapshot: Snapshot,
  formattedSnapshot: string,
  options?: {
    prefixMessage?: string // 前缀消息（如成功消息）
    verbose?: boolean // 是否详细模式
    includeUidExample?: boolean // 是否包含 UID 示例
  }
): string {
  // 计算可操作节点数量
  const actionableNodes = Array.from(snapshot.idToNode.values()).filter(
    (n) => n.backendNodeId || n.backendDOMNodeId
  ).length

  let resultText = ''

  // 添加前缀消息（如果有）
  if (options?.prefixMessage) {
    resultText += `${options.prefixMessage}\n\n`
  }

  // 添加快照标题和统计信息
  const snapshotTitle = options?.prefixMessage
    ? `操作后的页面快照（快照 ID: ${snapshot.snapshotId}）`
    : `已成功获取页面无障碍树快照（快照 ID: ${snapshot.snapshotId}）`
  resultText += `${snapshotTitle}。\n\n`
  resultText += `统计信息：\n`
  resultText += `- 总节点数：${snapshot.idToNode.size}\n`
  resultText += `- 可操作节点（有 backendNodeId）：${actionableNodes}\n`

  // 如果提供了 verbose 选项，添加详细模式信息
  if (options?.verbose !== undefined) {
    resultText += `- 详细模式：${options.verbose ? '是' : '否'}\n`
  }

  resultText += `\n`
  resultText += `快照内容：\n\`\`\`\n${formattedSnapshot}\n\`\`\`\n\n`

  // 添加 UID 提示（如果需要）
  if (options?.includeUidExample !== false) {
    const uidExample = options?.prefixMessage ? `"${snapshot.snapshotId}_5"` : `"1_5"`
    resultText += `提示：您可以使用快照中每个节点的 UID（如 ${uidExample}）进行后续操作`
    if (options?.prefixMessage) {
      resultText += '。'
    } else {
      resultText += '，例如点击、输入文本等。'
    }
  }

  console.log(resultText, 'resultText')

  return resultText
}

/**
 * 获取操作后的最新快照并格式化为返回结果
 * @param manager 快照管理器
 * @param successMessage 操作成功的消息
 * @returns 格式化的快照结果
 */
export async function getLatestSnapshotAfterOperation(
  manager: SnapshotManager,
  successMessage: string
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  // 操作后自动获取新快照
  const newSnapshot = await manager.createTextSnapshot(false)
  const formattedSnapshot = formatSnapshot(newSnapshot)

  // 使用公共函数格式化结果
  const resultText = formatSnapshotResult(newSnapshot, formattedSnapshot, {
    prefixMessage: successMessage,
    includeUidExample: true
  })

  return {
    content: [
      {
        type: 'text' as const,
        text: resultText
      }
    ]
  }
}
