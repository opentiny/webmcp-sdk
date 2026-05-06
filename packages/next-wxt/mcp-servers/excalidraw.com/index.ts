/**
 * excalidraw.com 工具适配层
 * 此文件由 content.ts 通过 scripting.executeScript 注入到 excalidraw.com 页面的 JS 上下文中执行
 * 可直接访问页面 DOM 和 React Fiber 树
 */

// 防止重复注入
if (!(window as any).__excalidrawToolsRegistered) {
  ;(window as any).__excalidrawToolsRegistered = true

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

    let excalidrawApiInstance: any = null
    let attempts = 0
    const MAX_TRAVERSAL_ATTEMPTS = 25
    while (fiberNode && attempts < MAX_TRAVERSAL_ATTEMPTS) {
      if (fiberNode.stateNode?.props) {
        const api = findApiInObject(fiberNode.stateNode.props)
        if (api) { excalidrawApiInstance = api; break }
      }
      if (fiberNode.memoizedProps) {
        const api = findApiInObject(fiberNode.memoizedProps)
        if (api) { excalidrawApiInstance = api; break }
      }
      if ([0, 2, 11, 14, 15].includes(fiberNode.tag) && fiberNode.memoizedState) {
        let currentHook = fiberNode.memoizedState
        let hookAttempts = 0
        while (currentHook && hookAttempts < 15) {
          const api = findApiInObject(currentHook.memoizedState)
          if (api) { excalidrawApiInstance = api; break }
          currentHook = currentHook.next
          hookAttempts++
        }
        if (excalidrawApiInstance) break
      }
      fiberNode = fiberNode.return
      attempts++
    }

    if (excalidrawApiInstance) {
      ;(window as any).excalidrawAPI = excalidrawApiInstance
    }
    return excalidrawApiInstance
  }

  function createFullExcalidrawElement(skeleton: any): any {
    const id = Math.random().toString(36).substring(2, 9)
    return {
      id,
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
      ...skeleton
    }
  }

  // 初始化：尝试获取 Excalidraw API
  const targetEl = document.querySelector('.excalidraw-app')
  if (targetEl) getExcalidrawAPIFromDOM(targetEl)

  const eventHandler: Record<string, (param: any) => any> = {
    getSceneElements: () => {
      try { return (window as any).excalidrawAPI.getSceneElements() }
      catch (e: any) { return { error: true, msg: e.message } }
    },
    addElement: (param: any) => {
      try {
        const existing = (window as any).excalidrawAPI.getSceneElements()
        const newElements = [...existing, ...param.eles.map((ele: any, idx: number) => {
          const el = createFullExcalidrawElement(ele)
          el.index = `a${existing.length + idx + 1}`
          return el
        })]
        ;(window as any).excalidrawAPI.updateScene({
          elements: newElements,
          appState: (window as any).excalidrawAPI.getAppState(),
          commitToHistory: true
        })
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
          ;(window as any).excalidrawAPI.updateScene({
            elements: newElements,
            appState: (window as any).excalidrawAPI.getAppState(),
            commitToHistory: true
          })
          return { success: true }
        }
        return { error: true, msg: 'element not found' }
      } catch (e: any) { return { error: true, msg: e.message } }
    },
    updateElement: (param: any) => {
      try {
        const existing = (window as any).excalidrawAPI.getSceneElements()
        param.forEach((item: any) => {
          const idx = existing.findIndex((e: any) => e.id === item.id)
          if (idx >= 0) (window as any).excalidrawAPI.mutateElement(existing[idx], { ...item })
        })
        return { success: true }
      } catch (e: any) { return { error: true, msg: e.message } }
    },
    cleanup: () => {
      try { (window as any).excalidrawAPI.resetScene(); return { success: true } }
      catch (e: any) { return { error: true, msg: e.message } }
    }
  }

  navigator.modelContext.registerTool({
    name: 'excalidraw_execute_command',
    title: 'Excalidraw 画布操作工具',
    description:
      'Execute commands to interact with the Excalidraw canvas, allowing manipulation of elements (e.g., add, update, delete).',
    inputSchema: {
      type: 'object',
      properties: {
        eventName: {
          type: 'string',
          description:
            '事件类型：getSceneElements-获取画布元素，addElement-添加元素，updateElement-更新元素，deleteElement-删除元素，cleanup-清空画布'
        },
        payload: {
          type: 'string',
          description: 'the payload passed to event, must be a json string'
        }
      },
      required: ['eventName']
    },
    execute: async ({ eventName, payload }: { eventName: string; payload?: string }) => {
      const handler = eventHandler[eventName]
      if (!handler) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: true, msg: `unknown command: ${eventName}` }) }] }
      }
      const param = JSON.parse(payload || '{}')
      const result = handler(param)
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    }
  })
}
