import { ref } from 'vue'
import { getCurrentTabId } from './utils/utils'
import { type RecordedPostRequest, startDebuggerRecorder, stopDebuggerRecorder } from './utils/debuggerRecorder'

const resolveRecorderEndpoint = () => {
  if (!import.meta.env.DEV) {
    return ''
  }
  const explicit = import.meta.env.VITE_CODE_RECORDER_ENDPOINT
  if (explicit) {
    return explicit
  }
  const runtimeOrigin =
    typeof window !== 'undefined' && window.location?.origin?.startsWith('http') ? window.location.origin : undefined
  const moduleOrigin = import.meta.url?.startsWith('http') ? new URL(import.meta.url).origin : undefined
  const devOrigin = runtimeOrigin || moduleOrigin || import.meta.env.VITE_DEV_SERVER_ORIGIN || 'http://localhost:5173'
  return `${devOrigin.replace(/\/$/, '')}/__next-wxt__/code-recorder`
}

const CODE_RECORDER_ENDPOINT = resolveRecorderEndpoint()

const sanitizeToolName = (value: string) => value.replace(/[^a-zA-Z0-9_]/g, '_')

const escapeBackticks = (value: string | undefined) => {
  if (!value) {
    return ''
  }
  return value.replace(/`/g, '\\`')
}

const buildHeadersLiteral = (headers: Record<string, string>) => {
  const entries = Object.entries(headers)
  if (!entries.length) {
    return '{}'
  }
  const literal = entries.map(([key, value]) => `    '${key}': ${JSON.stringify(value)}`).join(',\n')
  return `{\n${literal}\n  }`
}

const buildToolCode = (request: RecordedPostRequest) => {
  const url = new URL(request.url)
  const timestamp = new Date(request.timestamp).toISOString().replace(/[:.]/g, '-')
  const toolName = sanitizeToolName(
    `post_${url.hostname}_${url.pathname.split('/').filter(Boolean).join('_') || 'root'}_${timestamp}`
  )
  const defaultBody = escapeBackticks(request.postData || '')
  const headersLiteral = buildHeadersLiteral(request.headers)

  return `
  server.registerTool(
    '${toolName}',
    {
      title: 'POST ${url.pathname || '/'}',
      description: '录制自 ${url.origin} 的表单提交请求',
      inputSchema: {
        payload: z.string().optional().describe('可选：覆盖默认请求体，需为 JSON 或 form-urlencoded 字符串')
      }
    },
    async ({ payload }) => {
      const targetUrl = '${request.url}'
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: ${headersLiteral},
        body: payload ?? \`${defaultBody}\`
      })
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await response.json()
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
        }
      }
      const text = await response.text()
      return {
        content: [{ type: 'text', text }]
      }
    }
  )
`
}

const postToRecorderEndpoint = async (payload: { hostname: string; toolCode: string; origin: string }) => {
  if (!CODE_RECORDER_ENDPOINT) {
    throw new Error('DEV 环境未就绪，无法写入 MCP 工具文件')
  }
  const response = await fetch(CODE_RECORDER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const result = await response.json()
  if (!result?.success) {
    throw new Error(result?.message || '写入 MCP 工具失败')
  }
}

export const useGenerateCode = () => {
  const isRecording = ref(false)
  const activeTabId = ref<number | null>(null)

  const handleCapturedRequest = async (request: RecordedPostRequest) => {
    try {
      const toolCode = buildToolCode(request)
      const url = new URL(request.url)
      await postToRecorderEndpoint({
        hostname: url.hostname,
        toolCode,
        origin: `${url.protocol}//${url.host}`
      })
      showToast(`已生成 ${url.hostname} 的 MCP 工具`)
    } catch (error: any) {
      console.error('生成工具失败', error)
      showToast(error?.message || '生成工具失败')
    }
  }

  const startRecording = async () => {
    if (!import.meta.env.DEV) {
      const error = new Error('录制功能仅在 DEV 环境可用')
      showToast(error.message)
      throw error
    }
    if (isRecording.value) {
      return true
    }
    try {
      const tabId = await getCurrentTabId()
      await startDebuggerRecorder(tabId, handleCapturedRequest)
      activeTabId.value = tabId
      isRecording.value = true
      showToast('开始录制 POST 表单请求')
      return true
    } catch (error: any) {
      console.error('启动录制失败', error)
      showToast(error?.message || '启动录制失败')
      throw error
    }
  }

  const stopRecording = async () => {
    if (!isRecording.value) {
      return true
    }
    if (activeTabId.value === null) {
      isRecording.value = false
      return true
    }
    try {
      await stopDebuggerRecorder(activeTabId.value)
      showToast('录制已停止')
      return true
    } catch (error: any) {
      console.error('停止录制失败', error)
      showToast(error?.message || '停止录制失败')
      throw error
    } finally {
      isRecording.value = false
      activeTabId.value = null
    }
  }

  const toggleRecording = async () => {
    if (isRecording.value) {
      return await stopRecording()
    }
    return await startRecording()
  }

  return {
    isRecording,
    startRecording,
    stopRecording,
    toggleRecording
  }
}
