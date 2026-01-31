import { watch, Ref } from 'vue'
import { createRemoter } from '@opentiny/next-sdk'
import type { MenuItemConfig } from '@opentiny/next-sdk'

/**
 * 插件会话管理 Composable
 * 用于处理 sessionId 相关的所有逻辑：扫码添加插件、识别码输入、遥控器初始化等
 */
export function usePluginSession(options: {
  sessionId: Ref<string>
  agentRoot: string
  mode: string
  qrCodeUrl?: string
  remoteUrl?: string
  menuItems?: MenuItemConfig[]
  AILogoUrl?: string
  show: Ref<boolean>
  addPluginFromScan: (sessionId: string, agentRoot: string) => Promise<boolean>
  inputMessage: Ref<string>
}) {
  const {
    sessionId,
    agentRoot,
    mode,
    qrCodeUrl,
    remoteUrl,
    menuItems,
    AILogoUrl,
    show,
    addPluginFromScan,
    inputMessage
  } = options

  // 遥控器是否已创建（确保只创建一次）
  let isCreateRemoter = false

  /**
   * 处理扫码成功，添加插件
   * @param sessionIdValue 会话 ID
   */
  const handleScanSuccess = async (sessionIdValue: string) => {
    showLoadingToast('添加工具中...')

    if (sessionIdValue) {
      // 使用统一的扫码添加接口
      const success = await addPluginFromScan(sessionIdValue, agentRoot)

      if (success) {
        showToast('添加工具完成')
      } else {
        showToast('重复添加工具或添加失败')
      }
    } else {
      showToast('添加工具失败')
    }
  }

  /**
   * 处理输入框中的识别码（如 /abc123）
   * @param input 输入内容
   * @returns 是否是识别码（true 表示已处理，false 表示不是识别码）
   */
  const handleSessionIdInput = async (input: string): Promise<boolean> => {
    // 检查是否是识别码格式（/开头 + 6位以上字母数字）
    if (/^\/[A-Za-z0-9-]{6,}$/.test(input)) {
      try {
        // 添加 HTTP 响应状态检查
        const response = await fetch(`${agentRoot}client?sessionId=${input.slice(1)}`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const res = await response.json()
        const fetchedSessionId = res?.data?.sessionId

        if (fetchedSessionId) {
          await handleScanSuccess(fetchedSessionId)
        } else {
          showToast('添加工具失败,请检查识别码是否正确')
        }

        // 清空输入框
        inputMessage.value = ''
      } catch (error) {
        console.error('识别码处理失败:', error)
        showToast('添加工具失败,请检查识别码是否正确')
        inputMessage.value = ''
      }

      return true // 已处理识别码
    }

    return false // 不是识别码，继续正常消息处理
  }

  /**
   * 初始化遥控器模式
   */
  const initializeRemoter = () => {
    watch(
      sessionId,
      (value) => {
        if (value && mode === 'remoter' && !isCreateRemoter) {
          createRemoter({
            sessionId: value,
            qrCodeUrl,
            remoteUrl,
            menuItems,
            logoUrl: AILogoUrl,
            onShowAIChat: () => (show.value = true)
          })

          isCreateRemoter = true
        }
      },
      { immediate: true }
    )
  }

  /**
   * 监听 sessionId 变化，自动添加插件
   */
  const watchSessionIdChanges = () => {
    watch(sessionId, (value) => {
      if (value) {
        handleScanSuccess(value)
      }
    })
  }

  /**
   * 初始化所有 sessionId 相关的逻辑
   */
  const initialize = () => {
    // 1. 如果有初始 sessionId，立即添加工具
    if (sessionId.value) {
      handleScanSuccess(sessionId.value)
    }

    // 2. 初始化遥控器模式（如果需要）
    if (mode === 'remoter') {
      initializeRemoter()
    }

    // 3. 监听后续的 sessionId 变化
    watchSessionIdChanges()
  }

  return {
    // 核心方法
    handleScanSuccess,
    handleSessionIdInput,

    // 初始化方法
    initialize,

    // 独立的初始化方法（可选）
    initializeRemoter,
    watchSessionIdChanges
  }
}
