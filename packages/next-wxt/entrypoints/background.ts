export default defineBackground(() => {
  // 方案 2A：使用 Port 代理大模型流式请求（避免 mixed-content，也避免 sendMessage port 提前关闭）
  // 协议：
  // - content/page 侧：browser.runtime.connect({ name: 'smart-fill' })
  // - 发送：{ type: 'start', requestId, prompt }
  // - 接收：{ type: 'delta', requestId, delta } / { type: 'done', requestId, content } / { type: 'error', requestId, error }
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'smart-fill') return

    let abortController: AbortController | null = null

    const safePost = (msg: any) => {
      try {
        port.postMessage(msg)
      } catch {
        // ignore
      }
    }

    const cleanup = () => {
      if (abortController) {
        try {
          abortController.abort()
        } catch {
          // ignore
        }
      }
      abortController = null
    }

    port.onDisconnect.addListener(() => {
      cleanup()
    })

    port.onMessage.addListener(async (msg: any) => {
      if (!msg || msg.type !== 'start') return

      const requestId = msg.requestId || `${Date.now()}`
      const prompt = String(msg.prompt || '')
      if (!prompt) {
        safePost({ type: 'error', requestId, error: '缺少 prompt' })
        return
      }

      // 每次 start 都取消上一轮
      cleanup()
      abortController = new AbortController()

      try {
        // 在 background 侧读取模型配置（inner 模式会注入 x-auth-token）
        const { getModelConfigsWithToken } = await import('./sidepanel/model-manage')
        const configs = await getModelConfigsWithToken()
        const config =
          configs.find((c: any) => (c as any).isDefault) ||
          configs[0]

        if (!config?.baseURL || !config?.model) {
          safePost({ type: 'error', requestId, error: '未找到可用的模型配置，请检查扩展配置或环境变量。' })
          return
        }

        const url = String(config.baseURL).replace(/\/$/, '') + '/chat/completions'
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          ...(config.headers || {})
        }

        const r = await fetch(url, {
          method: 'POST',
          headers,
          signal: abortController.signal,
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            stream: true
          })
        })

        if (!r.ok) {
          const errText = await r.text()
          safePost({ type: 'error', requestId, error: errText || `请求失败 ${r.status}` })
          return
        }

        const contentType = r.headers.get('content-type') ?? ''
        if (!contentType.includes('text/event-stream')) {
          const json: any = await r.json()
          const err = json?.error?.message
          if (err) {
            safePost({ type: 'error', requestId, error: err })
            return
          }
          const content = json?.choices?.[0]?.message?.content?.trim?.() ?? ''
          safePost({ type: 'done', requestId, content })
          return
        }

        const reader = r.body?.getReader()
        if (!reader) {
          const text = await r.text()
          safePost({ type: 'done', requestId, content: text })
          return
        }

        const decoder = new TextDecoder('utf-8')
        let buffer = ''
        let content = ''

        streamLoop: while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data:')) continue
            const data = line.slice(5).trim()
            if (data === '[DONE]') break streamLoop
            try {
              const json = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>
                error?: { message?: string }
              }
              if (json.error?.message) {
                safePost({ type: 'error', requestId, error: json.error.message })
                return
              }
              const delta = json.choices?.[0]?.delta?.content
              if (typeof delta === 'string' && delta) {
                content += delta
                safePost({ type: 'delta', requestId, delta })
              }
            } catch {
              // ignore non-json lines
            }
          }
        }

        safePost({ type: 'done', requestId, content })
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        safePost({ type: 'error', requestId, error: e?.message ?? '代理调用失败' })
      }
    })
  })

  // 未整改该事件，因为此处需要返回值
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'inject-mcp-scripts') {
      const { hostname, tabId } = message
      try {
        injectMainScript(hostname, tabId).then((success: boolean) => {
          sendResponse({ success, hostname, tabId })
        })
      } catch (error: any) {
        console.error('脚本注入失败:', error)
        sendResponse({ success: false, hostname, tabId, error })
      }
      return true
    }

    if (message.type === 'inject-tools-script') {
      const { hostname, tabId } = message
      try {
        // 首次注册成功后可能需要刷新当前标签页，tabId 用于定位
        injectToolsScript(hostname, tabId).then((success: boolean) => {
          sendResponse({ success, hostname, tabId })
        })
      } catch (error: any) {
        console.error('脚本注入失败:', error)
        sendResponse({ success: false, hostname, tabId, error })
      }
      return true
    }

    // 智能填写：后台打开页签（不切换），等该页签加载完成后再用 cookies API 取该 URL 的 cookie（页面加载可能写入 cookie）
    if (message.type === 'smart-fill-open-and-get-cookie') {
      const { url } = message as { url: string }
      if (!url) {
        sendResponse({ error: '缺少 url' })
        return false
      }
      const cookiesApi = browser.cookies ?? (browser as any).cookies
      if (!cookiesApi) {
        sendResponse({ error: '当前环境不支持 cookies API' })
        return false
      }
      const TIMEOUT_MS = 20000
      let timeoutId: ReturnType<typeof setTimeout>
      browser.tabs
        .create({ url, active: false })
        .then((tab) => {
          const targetId = tab.id!
          timeoutId = setTimeout(() => {
            browser.tabs.onUpdated.removeListener(onUpdated)
            sendResponse({ error: '页签加载超时' })
          }, TIMEOUT_MS)
          const onUpdated = (id: number, changeInfo: { status?: string }) => {
            if (id !== targetId || changeInfo.status !== 'complete') return
            browser.tabs.onUpdated.removeListener(onUpdated)
            clearTimeout(timeoutId)
            cookiesApi
              .getAll({ url })
              .then((cookies: Array<{ name: string; value: string }>) => {
                const raw = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
                sendResponse({ raw, data: cookies })
              })
              .catch((err: Error) => {
                sendResponse({ error: err?.message ?? '读取 cookie 失败' })
              })
          }
          browser.tabs.onUpdated.addListener(onUpdated)
        })
        .catch((err: Error) => {
          sendResponse({ error: err?.message ?? '打开页签失败' })
        })
      return true
    }

  })

  onRuntimeMessage(
    'focus-current-tab',
    async (_, sender) => await browser.tabs.update(sender.tab?.id, { active: true }),
    'content->bg'
  )

  // 自动返回sender 给 content-script
  onRuntimeMessage('who-am-i', () => {}, 'content->bg')

  // 点击图标自动打开侧边栏
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.log(error))
})
