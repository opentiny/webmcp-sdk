import { withStateFields } from '../context'
import { waitForDomSettled } from './dom'

interface TrackedRequest {
  method: string
  url: string
  startedAt: number
}

// 进行中的 fetch / XHR，键为单调递增的请求编号
const inflight = new Map<number, TrackedRequest>()
let seq = 0
let installed = false
const xhrRequestInfo = new WeakMap<XMLHttpRequest, { method: string; url: string }>()

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function track(method: string, url: string): number {
  const id = ++seq
  inflight.set(id, { method: method.toUpperCase(), url, startedAt: Date.now() })
  return id
}

function fetchTarget(args: Parameters<typeof fetch>): { method: string; url: string } {
  const [input, init] = args
  const request = typeof input === 'object' && 'url' in input ? input : undefined
  const url = typeof input === 'string' ? input : request ? request.url : String(input)
  return { method: init?.method ?? request?.method ?? 'GET', url }
}

/**
 * fetch 的 Promise 在响应头到达时就落定，页面要等响应体收完才能渲染结果，因此读完响应副本才算结束。
 * SSE 等流式响应不会结束，只计到响应头。
 */
function untilBodyDone(res: Response): Promise<void> {
  if (!res.body || /text\/event-stream/i.test(res.headers.get('content-type') ?? '')) return Promise.resolve()
  const reader = res.clone().body!.getReader()
  const pump = (): Promise<void> => reader.read().then(({ done }) => (done ? undefined : pump()))
  return pump().catch(() => undefined)
}

function installRequestTracker() {
  if (installed) return
  installed = true
  const originalFetch = window.fetch
  if (typeof originalFetch === 'function') {
    window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
      const { method, url } = fetchTarget(args)
      const id = track(method, url)
      return originalFetch.apply(this, args).then(
        (res) => {
          void untilBodyDone(res).then(() => inflight.delete(id))
          return res
        },
        (err) => {
          inflight.delete(id)
          throw err
        }
      )
    } as typeof fetch
  }
  const xhrProto = window.XMLHttpRequest?.prototype
  if (xhrProto) {
    const originalOpen = xhrProto.open
    xhrProto.open = function (this: XMLHttpRequest, ...args: unknown[]) {
      xhrRequestInfo.set(this, { method: String(args[0]), url: String(args[1]) })
      return (originalOpen as (...a: unknown[]) => void).apply(this, args)
    } as XMLHttpRequest['open']
    const originalSend = xhrProto.send
    xhrProto.send = function (this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest['send']>) {
      const info = xhrRequestInfo.get(this) ?? { method: 'GET', url: '' }
      const id = track(info.method, info.url)
      this.addEventListener('loadend', () => inflight.delete(id), { once: true })
      return originalSend.apply(this, args)
    }
  }
}

function displayUrl(url: string): string {
  let shown = url
  try {
    const parsed = new URL(url, location.href)
    shown = parsed.origin === location.origin ? parsed.pathname + parsed.search : parsed.href
  } catch {
    // 无法解析时按原样显示
  }
  return shown.length > 80 ? `${shown.slice(0, 77)}...` : shown
}

const LOADING_INDICATOR_SELECTOR = '[aria-busy="true"], [role="progressbar"]'

function visibleLoadingIndicators(): string[] {
  const found = new Set<string>()
  document.querySelectorAll(LOADING_INDICATOR_SELECTOR).forEach((el) => {
    if (el.closest('[hidden], [aria-hidden="true"]')) return
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return
    found.add(el.getAttribute('role') === 'progressbar' ? 'progressbar' : 'aria-busy')
  })
  return [...found]
}

/** 等待结束时仍有本次动作发起的请求未完成，生成给模型的说明；全部完成时返回 undefined */
function describePending(firstId: number, waitedMs: number): string | undefined {
  const now = Date.now()
  const pending = [...inflight].filter(([id]) => id >= firstId).map(([, req]) => req)
  if (pending.length === 0) return undefined
  const listed = pending
    .slice(0, 3)
    .map((req) => `${req.method} ${displayUrl(req.url)}（已 ${((now - req.startedAt) / 1000).toFixed(1)}s）`)
  const more = pending.length > 3 ? ` 等 ${pending.length} 个` : ''
  const indicators = visibleLoadingIndicators()
  const indicatorNote = indicators.length > 0 ? `；页面有加载指示（${indicators.join('、')}）` : ''
  return (
    `[等待结果] 已等待 ${(waitedMs / 1000).toFixed(1)}s，仍有 ${pending.length} 个请求未完成：` +
    `${listed.join('，')}${more}${indicatorNote}。返回的页面状态可能还未更新`
  )
}

/**
 * 在执行动作前调用，返回的 settle() 等待动作期间发起的 fetch / XHR 完成（最多 maxWaitMs），再等 DOM 稳定。
 * 动作开始前已在进行的请求（轮询、长连接）不计入，避免每次动作都等到上限。
 * 等待结束时仍有请求未完成，settle() 返回说明文字，由 withSettleNote 附加到工具结果。
 */
export function beginAction(maxWaitMs = 2000) {
  installRequestTracker()
  const firstId = seq + 1
  return {
    async settle(): Promise<string | undefined> {
      const started = Date.now()
      // 事件处理函数常在 await 之后才发请求，留一小段时间让请求登记
      await sleep(30)
      const deadline = started + maxWaitMs
      while ([...inflight.keys()].some((id) => id >= firstId) && Date.now() < deadline) {
        await sleep(50)
      }
      await waitForDomSettled()
      return describePending(firstId, Date.now() - started)
    }
  }
}

export function withSettleNote<T extends { content: Array<{ type: 'text'; text: string }> }>(
  res: T,
  note: string | undefined
): T {
  if (note) res.content[0].text = withStateFields(res.content[0].text, { waitResult: note })
  return res
}
