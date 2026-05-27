/**
 * excalidraw.com 工具适配层
 * 由 browser.ts 通过 page.evaluate() 注入到 excalidraw.com 页面的 JS 上下文中执行
 * 可直接访问页面 DOM 和 React Fiber 树
 *
 * 注意：工具注册使用 navigator.modelContext（polyfill 服务端接口）
 */

const _excalidrawMcp = (navigator as any).modelContext
if (!_excalidrawMcp || typeof _excalidrawMcp.registerTool !== 'function') {
  console.warn('[webmcp-tools] excalidraw.com: navigator.modelContext.registerTool 未就绪，跳过注入')
} else if (!(window as any).__webmcptools_excalidraw) {
  const mcp = _excalidrawMcp
  try {
    // ─── 内部工具函数 ────────────────────────────────────────────────

    function getExcalidrawAPIFromDOM(domElement: Element | null): any {
      if (!domElement) return null
      const reactFiberKey = Object.keys(domElement).find(
        (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
      )
      if (!reactFiberKey) return null
      let fiberNode = (domElement as any)[reactFiberKey]

      function isExcalidrawAPI(obj: any): boolean {
        return (
          typeof obj === 'object' &&
          obj !== null &&
          typeof obj.updateScene === 'function' &&
          typeof obj.getSceneElements === 'function' &&
          typeof obj.getAppState === 'function'
        )
      }

      function findApiInObject(objToSearch: any): any {
        if (isExcalidrawAPI(objToSearch)) return objToSearch
        if (typeof objToSearch === 'object' && objToSearch !== null) {
          for (const key in objToSearch) {
            if (Object.prototype.hasOwnProperty.call(objToSearch, key)) {
              const found = findApiInObject(objToSearch[key])
              if (found) return found
            }
          }
        }
        return null
      }

      let excalidrawApi: any = null
      let attempts = 0
      const MAX_TRAVERSAL = 25
      while (fiberNode && attempts < MAX_TRAVERSAL) {
        if (fiberNode.stateNode?.props) {
          const api = findApiInObject(fiberNode.stateNode.props)
          if (api) { excalidrawApi = api; break }
        }
        if (fiberNode.memoizedProps) {
          const api = findApiInObject(fiberNode.memoizedProps)
          if (api) { excalidrawApi = api; break }
        }
        if ([0, 2, 11, 14, 15].includes(fiberNode.tag) && fiberNode.memoizedState) {
          let hook = fiberNode.memoizedState
          let hookAttempts = 0
          while (hook && hookAttempts < 15) {
            const api = findApiInObject(hook.memoizedState)
            if (api) { excalidrawApi = api; break }
            hook = hook.next
            hookAttempts++
          }
          if (excalidrawApi) break
        }
        fiberNode = fiberNode.return
        attempts++
      }

      if (excalidrawApi) {
        ;(window as any).excalidrawAPI = excalidrawApi
      }
      return excalidrawApi
    }

    function createFullElement(skeleton: any): any {
      const id = skeleton.id || Math.random().toString(36).substring(2, 9)
      const el = {
        seed: Math.floor(Math.random() * 2 ** 31),
        versionNonce: Math.floor(Math.random() * 2 ** 31),
        updated: Date.now(),
        isDeleted: false,
        fillStyle: 'hachure',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        angle: 0,
        groupIds: [],
        strokeColor: '#000000',
        backgroundColor: 'transparent',
        version: 1,
        locked: false,
        ...skeleton,
        id
      }
      // 防止 linear element 缺少 points 导致崩溃
      if (['arrow', 'line', 'freedraw'].includes(el.type)) {
        if (!el.points || !Array.isArray(el.points)) {
          el.points = [[0, 0], [100, 100]]
        }
      }
      return el
    }

    // 初始化：尝试获取 Excalidraw API
    const targetEl = document.querySelector('.excalidraw-app')
    if (targetEl) getExcalidrawAPIFromDOM(targetEl)

    // ─── 命令处理器 ──────────────────────────────────────────────────

    const handlers: Record<string, (param: any) => any> = {
      getSceneElements: () => {
        try { return (window as any).excalidrawAPI.getSceneElements() }
        catch (e: any) { return { error: true, msg: e.message } }
      },
      addElement: (param: any) => {
        try {
          const existing = (window as any).excalidrawAPI.getSceneElements()
          const newElements = [
            ...existing,
            ...param.eles.map((ele: any, idx: number) => {
              const el = createFullElement(ele)
              el.index = `a${existing.length + idx + 1}`
              return el
            })
          ]
          ;(window as any).excalidrawAPI.updateScene({ elements: newElements, commitToHistory: true })
          return { success: true }
        } catch (e: any) { return { error: true, msg: e.message } }
      },
      deleteElement: (param: any) => {
        try {
          const existing = (window as any).excalidrawAPI.getSceneElements()
          const idx = existing.findIndex((e: any) => e.id === param.id)
          if (idx >= 0) {
            const newElements = [...existing]
            newElements.splice(idx, 1)
            ;(window as any).excalidrawAPI.updateScene({ elements: newElements, commitToHistory: true })
            return { success: true }
          }
          return { error: true, msg: 'element not found' }
        } catch (e: any) { return { error: true, msg: e.message } }
      },
      updateElement: (param: any) => {
        try {
          const existing = [...(window as any).excalidrawAPI.getSceneElements()]
          ;(param as any[]).forEach((item: any) => {
            const idx = existing.findIndex((e: any) => e.id === item.id)
            if (idx >= 0) {
              existing[idx] = {
                ...existing[idx],
                ...item,
                version: (existing[idx].version || 1) + 1,
                updated: Date.now()
              }
            }
          })
          ;(window as any).excalidrawAPI.updateScene({ elements: existing, commitToHistory: true })
          return { success: true }
        } catch (e: any) { return { error: true, msg: e.message } }
      },
      cleanup: () => {
        try { (window as any).excalidrawAPI.resetScene(); return { success: true } }
        catch (e: any) { return { error: true, msg: e.message } }
      }
    }

    // ─── 工具注册 ────────────────────────────────────────────────────

    mcp.registerTool({
      name: 'excalidraw_execute_command',
      title: 'Excalidraw 画布操作',
      description: '执行命令与 Excalidraw 画布交互，支持获取/添加/更新/删除元素以及清空画布。使用前请先阅读画图 skill 指导。',
      inputSchema: {
        type: 'object',
        properties: {
          eventName: {
            type: 'string',
            description: '命令类型：getSceneElements-获取画布元素，addElement-添加元素，updateElement-更新元素，deleteElement-删除元素，cleanup-清空画布'
          },
          payload: {
            type: 'string',
            description: '传给命令的参数，必须是 JSON 字符串。addElement 时 payload 为 {"eles": [...元素数组]}，updateElement 时为元素数组'
          }
        },
        required: ['eventName']
      },
      execute: async ({ eventName, payload }: { eventName: string; payload?: string }) => {
        // 如果 API 不存在，尝试重新获取
        if (!(window as any).excalidrawAPI) {
          const el = document.querySelector('.excalidraw-app')
          if (el) getExcalidrawAPIFromDOM(el)
        }

        const handler = handlers[eventName]
        if (!handler) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ error: true, msg: `unknown command: ${eventName}. 可用命令: ${Object.keys(handlers).join(', ')}` })
            }]
          }
        }

        const param = JSON.parse(payload || '{}')
        const result = handler(param)
        return { content: [{ type: 'text', text: JSON.stringify(result) }] }
      }
    })

    // 注册成功后设 flag
    ;(window as any).__webmcptools_excalidraw = true
    console.log('[webmcp-tools] excalidraw.com 工具注册成功')
  } catch (e: any) {
    console.error('[webmcp-tools] excalidraw.com 工具注册失败:', e.message)
  }
}
