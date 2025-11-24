// 调试器状态
interface TabDebuggerState {
  refCount: number // 引用计数
  isAttached: boolean // 是否已附加
  attachPromise: Promise<void> | null // 附加操作的 Promise（用于避免重复附加）
}

// 全局状态：跟踪每个标签页的调试器状态
const tabStates = new Map<number, TabDebuggerState>()

/**
 * 获取或创建标签页的调试器状态
 */
function getTabState(tabId: number): TabDebuggerState {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      refCount: 0,
      isAttached: false,
      attachPromise: null
    })
  }
  return tabStates.get(tabId)!
}

/**
 * 附加调试器到标签页（带引用计数）
 * 如果已经附加，只增加引用计数
 * @param tabId 标签页 ID
 * @returns Promise<void>
 */
export async function attachDebugger(tabId: number): Promise<void> {
  const state = getTabState(tabId)
  state.refCount++

  // 如果已经附加，直接返回
  if (state.isAttached) {
    return
  }

  // 如果正在附加，等待附加完成
  if (state.attachPromise) {
    return state.attachPromise
  }

  // 创建附加 Promise
  state.attachPromise = new Promise<void>((resolve, reject) => {
    const debuggee = { tabId }

    browser.debugger.attach(debuggee, '1.3', (attachError?: Error) => {
      if (browser.runtime.lastError || attachError) {
        const errorMsg = browser.runtime.lastError?.message || attachError?.message || '附加调试器失败'

        // 如果错误是"另一个调试器已附加"，说明已经附加过了（可能是其他工具附加的）
        // 这种情况下，我们标记为已附加，继续使用
        if (errorMsg.includes('Another debugger')) {
          console.warn(`标签页 ${tabId} 已被其他调试器附加，继续使用现有调试器`)
          state.isAttached = true
          state.attachPromise = null
          resolve()
          return
        }

        // 其他错误，拒绝 Promise
        state.attachPromise = null
        state.refCount-- // 回滚引用计数
        reject(new Error(`附加调试器失败: ${errorMsg}`))
        return
      }

      // 成功附加
      state.isAttached = true
      state.attachPromise = null
      resolve()
    })
  })

  return state.attachPromise
}

/**
 * 分离调试器（带引用计数）
 * 只有当引用计数为 0 时才真正分离调试器
 * @param tabId 标签页 ID
 * @returns Promise<void>
 */
export async function detachDebugger(tabId: number): Promise<void> {
  const state = getTabState(tabId)

  if (state.refCount <= 0) {
    console.warn(`标签页 ${tabId} 的调试器引用计数已为 0，无需分离`)
    return
  }

  state.refCount--

  // 如果还有引用，不分离
  if (state.refCount > 0) {
    return
  }

  // 引用计数为 0，真正分离调试器
  if (!state.isAttached) {
    return
  }

  return new Promise<void>((resolve, reject) => {
    const debuggee = { tabId }

    browser.debugger.detach(debuggee, () => {
      if (browser.runtime.lastError) {
        const errorMsg = browser.runtime.lastError.message
        // 如果分离失败，可能是因为调试器已经被其他工具分离了
        // 这种情况下，我们只更新状态，不抛出错误
        console.warn(`分离调试器失败（可能已被其他工具分离）: ${errorMsg}`)
      }

      state.isAttached = false
      state.attachPromise = null
      tabStates.delete(tabId) // 清理状态
      resolve()
    })
  })
}

/**
 * 执行 CDP 命令（自动管理调试器）
 * @param tabId 标签页 ID
 * @param method CDP 方法名
 * @param params 命令参数
 * @returns Promise<any> 命令执行结果
 */
export async function executeCDPCommand(tabId: number, method: string, params: any = {}): Promise<any> {
  // 确保调试器已附加
  await attachDebugger(tabId)

  return new Promise((resolve, reject) => {
    const debuggee = { tabId }

    browser.debugger.sendCommand(debuggee, method, params, (result?: any, error?: Error) => {
      if (browser.runtime.lastError || error) {
        const errorMsg = browser.runtime.lastError?.message || error?.message || '执行 CDP 命令失败'

        // 如果错误是"未附加调试器"，更新状态
        if (errorMsg.includes('not attached') || errorMsg.includes('No target with given id')) {
          const state = getTabState(tabId)
          state.isAttached = false
        }

        reject(new Error(`${method} 失败: ${errorMsg || '未知错误'}`))
        return
      }

      resolve(result)
    })
  })
}

/**
 * 检查标签页的调试器状态
 * @param tabId 标签页 ID
 * @returns 调试器状态信息
 */
export function getDebuggerState(tabId: number): { refCount: number; isAttached: boolean } {
  const state = getTabState(tabId)
  return {
    refCount: state.refCount,
    isAttached: state.isAttached
  }
}

/**
 * 强制分离所有调试器（用于清理）
 */
export async function detachAllDebuggers(): Promise<void> {
  const promises: Promise<void>[] = []
  for (const tabId of tabStates.keys()) {
    const state = tabStates.get(tabId)!
    if (state.isAttached) {
      // 将引用计数设为 0，然后分离
      state.refCount = 0
      promises.push(detachDebugger(tabId))
    }
  }
  await Promise.all(promises)
}
