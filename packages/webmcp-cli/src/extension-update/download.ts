import { ExtensionUpdateError } from './errors.js'

export interface DownloadOptions {
  /** 清单声明的大小；实际字节数必须与之相等 */
  expectedSize: number
  maxRedirects: number
  timeoutMs: number
  fetchImpl?: typeof fetch
}

function checkUrl(raw: string, base?: string): URL {
  let url: URL
  try {
    url = new URL(raw, base)
  } catch {
    throw new ExtensionUpdateError('download_failed', `下载地址无效：${raw}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ExtensionUpdateError('download_failed', `下载地址只允许 http 或 https：${url.protocol}`)
  }
  if (url.username || url.password) {
    throw new ExtensionUpdateError('download_failed', '下载地址不能包含用户名或密码')
  }
  return url
}

function sizeMismatch(actual: string, expected: number) {
  return new ExtensionUpdateError('size_exceeded', `安装包大小（${actual}）与清单声明的 ${expected} 字节不符`)
}

/**
 * 下载安装包：手动跟随重定向以限制次数并逐跳校验地址；读取过程中超过声明大小立即中止。
 * 不附带任何凭据（Node 的 fetch 不携带 cookie，地址中的用户名与密码被拒绝）。
 */
export async function downloadPackage(rawUrl: string, options: DownloadOptions): Promise<Buffer> {
  const fetchImpl = options.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)

  try {
    let url = checkUrl(rawUrl)
    let response: Response
    for (let redirects = 0; ; redirects++) {
      try {
        response = await fetchImpl(url, { redirect: 'manual', signal: controller.signal })
      } catch (err: any) {
        throw new ExtensionUpdateError('download_failed', `下载安装包失败：${err?.message ?? err}`)
      }
      const location = response.headers.get('location')
      if (response.status < 300 || response.status >= 400 || !location) break
      await response.body?.cancel()
      if (redirects >= options.maxRedirects) {
        throw new ExtensionUpdateError('download_failed', `下载安装包时重定向超过 ${options.maxRedirects} 次`)
      }
      url = checkUrl(location, url.href)
    }

    if (!response.ok) {
      await response.body?.cancel()
      throw new ExtensionUpdateError('download_failed', `下载安装包失败：HTTP ${response.status}`)
    }

    const declared = Number(response.headers.get('content-length') ?? NaN)
    if (Number.isFinite(declared) && declared !== options.expectedSize) {
      await response.body?.cancel()
      throw sizeMismatch(`${declared} 字节`, options.expectedSize)
    }

    const chunks: Buffer[] = []
    let total = 0
    if (response.body) {
      const reader = response.body.getReader()
      for (;;) {
        let chunk: ReadableStreamReadResult<Uint8Array>
        try {
          chunk = await reader.read()
        } catch (err: any) {
          throw new ExtensionUpdateError('download_failed', `下载安装包失败：${err?.message ?? err}`)
        }
        if (chunk.done) break
        total += chunk.value.byteLength
        if (total > options.expectedSize) {
          await reader.cancel()
          throw sizeMismatch(`超过 ${options.expectedSize} 字节`, options.expectedSize)
        }
        chunks.push(Buffer.from(chunk.value))
      }
    }
    if (total !== options.expectedSize) throw sizeMismatch(`${total} 字节`, options.expectedSize)
    return Buffer.concat(chunks)
  } finally {
    clearTimeout(timer)
  }
}
