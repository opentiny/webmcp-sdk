import { initializeWebMCPPolyfill } from '@mcp-b/webmcp-polyfill'

/** 用户侧注册信息 */
export interface RegisterInfo {
  /** 系统名称 */
  name: string
  /** 系统描述 */
  description?: string
}
let isRegistered = false

/**  将页面注册为智能应用 */
export async function registerOnPage(option: RegisterInfo) {
  if (isRegistered) return

  isRegistered = true
  initializeWebMCPPolyfill()

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
      toolsList.forEach((tool) => delete (tool as any).window)

      event.source?.postMessage(JSON.stringify(toolsList))
    }
  })
  // 执行工具： type, name, args?
  window.addEventListener('message', async (event) => {
    if (event.data.type === 'excuteTool') {
      const toolsList = await document.modelContext.getTools()
      const { name, args = {} } = event.data

      const tool = toolsList.find((tool) => tool.name === name)
      let response = ''
      try {
        if (tool) {
          response = (await document.modelContext.executeTool(toolsList[0], JSON.stringify(args))) || ''
        } else {
        }
      } catch (error: any) {
        response = `${name}工具调用出错，原因： ` + error?.message || 'Unknown error'
      }

      event.source?.postMessage(JSON.stringify(response))
    }
  })
}
