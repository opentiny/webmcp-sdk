import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'

/** 用户侧注册信息 */
export interface RegisterInfo {
  /** 系统名称 */
  name: string
  /** 系统描述 */
  description?: string
}

/**  将页面注册为智能应用 */
export function registerOnPage(option: RegisterInfo) {
  if (window.__IS_NEXTAGENT_PAGE__) return

  window.__IS_NEXTAGENT_PAGE__ = true
  initializeWebMCPPolyfill()
  registerPageMessage(option)
}

/** 注册页面消息
 *
 * 无论是智能体在同个页面，还是跨iframe，都可以通过postMessage进行通信
 *
 * @listens getRegisterInfo: 获取注册信息
 * @listens listTools: 列出工具
 * @listens excuteTool: 执行工具
 *
 * @example window.postMessage({ type: 'getRegisterInfo' }, '*')
 * @example window.postMessage({ type: 'excuteTool', name: 'toolName', args: { city: 'Beijing' } }, '*')
 */
function registerPageMessage(option: RegisterInfo) {
  // 回复页面注册信息
  window.addEventListener('message', (event) => {
    if (event.data.type === 'getRegisterInfo') {
      event.source?.postMessage(option)
    }
  })

  // 列出工具
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'listTools') {
      const toolsList = await document.modelContext.getTools()
      toolsList.forEach((tool: any) => delete (tool as any).window)

      event.source?.postMessage(JSON.stringify(toolsList))
    }
  })
  // 执行工具： type, name, args?
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'excuteTool') {
      const toolsList = await document.modelContext.getTools()
      const { name, args = {} } = event.data

      const tool = toolsList.find((tool: any) => tool.name === name)
      let response = ''
      try {
        response = tool
          ? (await document.modelContext.executeTool(toolsList[0], JSON.stringify(args))) || ''
          : `${name}工具不存在`
      } catch (error: any) {
        response = `${name}工具调用出错，原因： ` + error?.message || 'Unknown error'
      }

      event.source?.postMessage(JSON.stringify(response))
    }
  })
}
