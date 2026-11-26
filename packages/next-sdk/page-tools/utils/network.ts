import { waitForDomSettled } from './dom'

// 进行中的 fetch / XHR 的请求编号（单调递增）
const inflight = new Set<number>()
let seq = 0
let installed = false

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function installRequestTracker() {
  if (installed) return
  installed = true
  const originalFetch = window.fetch
  if (typeof originalFetch === 'function') {
    window.fetch = function (this: unknown, ...args: Parameters<typeof fetch>) {
      const id = ++seq
      inflight.add(id)
      return originalFetch.apply(this, args).finally(() => inflight.delete(id))
    } as typeof fetch
  }
  const xhrProto = window.XMLHttpRequest?.prototype
  if (xhrProto) {
    const originalSend = xhrProto.send
    xhrProto.send = function (this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest['send']>) {
      const id = ++seq
      inflight.add(id)
      this.addEventListener('loadend', () => inflight.delete(id), { once: true })
      return originalSend.apply(this, args)
    }
  }
}

/**
 * 在执行动作前调用，返回的 settle() 等待动作期间发起的 fetch / XHR 完成（最多 maxWaitMs），再等 DOM 稳定。
 * 动作开始前已在进行的请求（轮询、长连接）不计入，避免每次动作都等到超时。
 */
export function beginAction(maxWaitMs = 4000) {
  installRequestTracker()
  const firstId = seq + 1
  return {
    async settle() {
      // 事件处理函数常在 await 之后才发请求，留一小段时间让请求登记
      await sleep(30)
      const deadline = Date.now() + maxWaitMs
      while ([...inflight].some((id) => id >= firstId) && Date.now() < deadline) {
        await sleep(50)
      }
      await waitForDomSettled()
    }
  }
}
