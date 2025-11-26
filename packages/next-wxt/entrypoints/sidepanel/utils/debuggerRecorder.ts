import { attachDebugger, detachDebugger, executeCDPCommand } from './debuggerManager'

export interface RecordedPostRequest {
  url: string
  method: string
  headers: Record<string, string>
  postData?: string
  initiatorType?: string
  timestamp: number
}

type RecorderState = {
  listener: Parameters<typeof browser.debugger.onEvent.addListener>[0]
  callback: (request: RecordedPostRequest) => void
}

const recorderStates = new Map<number, RecorderState>()

const sanitizeHeaders = (headers: Record<string, string> | undefined) => {
  if (!headers) return {}
  const forbidden = new Set(['content-length', 'host', 'origin'])
  const normalized: Record<string, string> = {}
  Object.entries(headers).forEach(([key, value]) => {
    if (!key) return
    if (forbidden.has(key.toLowerCase())) return
    normalized[key] = value
  })
  return normalized
}

export const startDebuggerRecorder = async (tabId: number, callback: (request: RecordedPostRequest) => void) => {
  if (recorderStates.has(tabId)) {
    return
  }

  await attachDebugger(tabId)
  await executeCDPCommand(tabId, 'Network.enable', {
    maxPostDataSize: -1,
    maxResourceBufferSize: -1
  })

  const listener: Parameters<typeof browser.debugger.onEvent.addListener>[0] = (source, method, params) => {
    if (!source?.tabId || source.tabId !== tabId) {
      return
    }

    if (method === 'Network.requestWillBeSent' && (params as any)?.request) {
      const { requestId, request, initiator } = params as any
      if (request.method !== 'POST') {
        return
      }

      const processRequest = async () => {
        let postData: string | undefined = request.postData
        if (!postData) {
          try {
            const result = await executeCDPCommand(tabId, 'Network.getRequestPostData', { requestId })
            if (result?.postData) {
              postData = result.postData
            }
          } catch (error) {
            console.warn('获取 POST 数据失败', error)
          }
        }

        callback({
          url: request.url,
          method: request.method,
          headers: sanitizeHeaders(request.headers),
          postData,
          initiatorType: initiator?.type,
          timestamp: Date.now()
        })
      }

      processRequest().catch((error) => {
        console.error('处理录制请求失败', error)
      })
    }
  }

  browser.debugger.onEvent.addListener(listener)
  recorderStates.set(tabId, { listener, callback })
}

export const stopDebuggerRecorder = async (tabId: number) => {
  const state = recorderStates.get(tabId)
  if (!state) {
    return
  }

  browser.debugger.onEvent.removeListener(state.listener)
  recorderStates.delete(tabId)

  try {
    await executeCDPCommand(tabId, 'Network.disable', {})
  } catch (error) {
    console.warn('Network.disable 调用失败，可忽略', error)
  }

  await detachDebugger(tabId)
}
