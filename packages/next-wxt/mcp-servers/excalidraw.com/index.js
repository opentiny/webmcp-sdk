export default ({ server, z }) => {
  const SCRIPT_ID = 'excalidraw-control-script'
  if (window[SCRIPT_ID]) {
    return
  }
  function getExcalidrawAPIFromDOM(domElement) {
    if (!domElement) {
      return null
    }
    const reactFiberKey = Object.keys(domElement).find(
      (key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')
    )
    if (!reactFiberKey) {
      return null
    }
    let fiberNode = domElement[reactFiberKey]
    if (!fiberNode) {
      return null
    }
    function isExcalidrawAPI(obj) {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.updateScene === 'function' &&
        typeof obj.getSceneElements === 'function' &&
        typeof obj.getAppState === 'function'
      )
    }
    function findApiInObject(objToSearch) {
      if (isExcalidrawAPI(objToSearch)) {
        return objToSearch
      }
      if (typeof objToSearch === 'object' && objToSearch !== null) {
        for (const key in objToSearch) {
          if (Object.prototype.hasOwnProperty.call(objToSearch, key)) {
            const found = findApiInObject(objToSearch[key])
            if (found) {
              return found
            }
          }
        }
      }
      return null
    }
    let excalidrawApiInstance = null
    let attempts = 0
    const MAX_TRAVERSAL_ATTEMPTS = 25
    while (fiberNode && attempts < MAX_TRAVERSAL_ATTEMPTS) {
      if (fiberNode.stateNode && fiberNode.stateNode.props) {
        const api = findApiInObject(fiberNode.stateNode.props)
        if (api) {
          excalidrawApiInstance = api
          break
        }
        if (isExcalidrawAPI(fiberNode.stateNode.props.excalidrawAPI)) {
          excalidrawApiInstance = fiberNode.stateNode.props.excalidrawAPI
          break
        }
      }
      if (fiberNode.memoizedProps) {
        const api = findApiInObject(fiberNode.memoizedProps)
        if (api) {
          excalidrawApiInstance = api
          break
        }
        if (isExcalidrawAPI(fiberNode.memoizedProps.excalidrawAPI)) {
          excalidrawApiInstance = fiberNode.memoizedProps.excalidrawAPI
          break
        }
      }
      if (fiberNode.tag === 1 && fiberNode.stateNode && fiberNode.stateNode.state) {
        const api = findApiInObject(fiberNode.stateNode.state)
        if (api) {
          excalidrawApiInstance = api
          break
        }
      }
      if (
        fiberNode.tag === 0 ||
        fiberNode.tag === 2 ||
        fiberNode.tag === 14 ||
        fiberNode.tag === 15 ||
        fiberNode.tag === 11
      ) {
        if (fiberNode.memoizedState) {
          let currentHook = fiberNode.memoizedState
          let hookAttempts = 0
          const MAX_HOOK_ATTEMPTS = 15
          while (currentHook && hookAttempts < MAX_HOOK_ATTEMPTS) {
            const api = findApiInObject(currentHook.memoizedState)
            if (api) {
              excalidrawApiInstance = api
              break
            }
            currentHook = currentHook.next
            hookAttempts++
          }
          if (excalidrawApiInstance) break
        }
      }
      if (fiberNode.stateNode) {
        const api = findApiInObject(fiberNode.stateNode)
        if (api && api !== fiberNode.stateNode.props && api !== fiberNode.stateNode.state) {
          excalidrawApiInstance = api
          break
        }
      }
      if (fiberNode.tag === 9 && fiberNode.memoizedProps && typeof fiberNode.memoizedProps.value !== 'undefined') {
        const api = findApiInObject(fiberNode.memoizedProps.value)
        if (api) {
          excalidrawApiInstance = api
          break
        }
      }
      if (fiberNode.return) {
        fiberNode = fiberNode.return
      } else {
        break
      }
      attempts++
    }
    if (excalidrawApiInstance) {
      window.excalidrawAPI = excalidrawApiInstance
      console.log('现在您可以通过 `window.foundExcalidrawAPI` 在控制台访问它。')
    } else {
      console.error('在检查组件树后未能找到 excalidrawAPI。')
    }
    return excalidrawApiInstance
  }
  function createFullExcalidrawElement(skeleton) {
    const id = Math.random().toString(36).substring(2, 9)
    const seed = Math.floor(Math.random() * 2 ** 31)
    const versionNonce = Math.floor(Math.random() * 2 ** 31)
    const defaults = {
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
      locked: false
    }
    const fullElement = {
      id: id,
      seed: seed,
      versionNonce: versionNonce,
      updated: Date.now(),
      ...defaults,
      ...skeleton
    }
    return fullElement
  }
  let targetElementForAPI = document.querySelector('.excalidraw-app')
  if (targetElementForAPI) {
    getExcalidrawAPIFromDOM(targetElementForAPI)
  }
  const eventHandler = {
    getSceneElements: () => {
      try {
        return window.excalidrawAPI.getSceneElements()
      } catch (error) {
        return { error: true, msg: JSON.stringify(error) }
      }
    },
    addElement: (param) => {
      try {
        const existingElements = window.excalidrawAPI.getSceneElements()
        const newElements = [...existingElements]
        param.eles.forEach((ele, idx) => {
          const newEle = createFullExcalidrawElement(ele)
          newEle.index = `a${existingElements.length + idx + 1}`
          newElements.push(newEle)
        })
        console.log('newElements ==>', newElements)
        const appState = window.excalidrawAPI.getAppState()
        window.excalidrawAPI.updateScene({ elements: newElements, appState: appState, commitToHistory: true })
        return { success: true }
      } catch (error) {
        return { error: true, msg: JSON.stringify(error) }
      }
    },
    deleteElement: (param) => {
      try {
        const existingElements = window.excalidrawAPI.getSceneElements()
        const newElements = [...existingElements]
        const idx = newElements.findIndex((e) => e.id === param.id)
        if (idx >= 0) {
          newElements.splice(idx, 1)
          const appState = window.excalidrawAPI.getAppState()
          window.excalidrawAPI.updateScene({ elements: newElements, appState: appState, commitToHistory: true })
          return { success: true }
        } else {
          return { error: true, msg: 'element not found' }
        }
      } catch (error) {
        return { error: true, msg: JSON.stringify(error) }
      }
    },
    updateElement: (param) => {
      try {
        const existingElements = window.excalidrawAPI.getSceneElements()
        const resIds = []
        for (let i = 0; i < param.length; i++) {
          const idx = existingElements.findIndex((e) => e.id === param[i].id)
          if (idx >= 0) {
            resIds.push[idx]
            window.excalidrawAPI.mutateElement(existingElements[idx], { ...param[i] })
          }
        }
        return { success: true, msg: `已更新元素：${resIds.join(',')}` }
      } catch (error) {
        return { error: true, msg: JSON.stringify(error) }
      }
    },
    cleanup: () => {
      try {
        window.excalidrawAPI.resetScene()
        return { success: true }
      } catch (error) {
        return { error: true, msg: JSON.stringify(error) }
      }
    }
  }
  const handleExecution = (event) => {
    const { action, payload } = event.detail
    const param = JSON.parse(payload || '{}')
    let data, error
    try {
      const handler = eventHandler[action]
      if (!handler) {
        error = 'event name not found'
      }
      data = handler(param)
    } catch (e) {
      error = e.message
    }

    return { success: true, data, error }
  }

  server.registerTool(
    'chrome_send_command_to_inject_script',
    {
      title: 'https://excalidraw.com 网站画布操作工具',
      description:
        'if the script injected using chrome_inject_script listens for user-defined events, this tool can be used to trigger those events',
      inputSchema: {
        eventName: z
          .string()
          .describe(
            '事件类型：getSceneElements-获取画布元素，addElement-添加元素，updateElement-更新元素，deleteElement-删除元素，cleanup-清空画布'
          ),
        payload: z.string().describe('the payload passed to event, must be a json string')
      }
    },
    async ({ eventName, payload }) => {
      const result = handleExecution({ detail: { action: eventName, payload } })
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }]
      }
    }
  )
}
