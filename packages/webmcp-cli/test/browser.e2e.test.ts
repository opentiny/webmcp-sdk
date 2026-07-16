/**
 * webmcp-cli 浏览器 E2E：自启动 headless Chrome，走真实 CLI 命令。
 * 依赖：已执行 `pnpm build`；CI 可通过 CHROME_PATH 指定 Chrome。
 */
import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgRoot = path.resolve(__dirname, '..')
const binPath = path.join(pkgRoot, 'dist', 'bin.js')
const injectPath = path.join(pkgRoot, 'dist', 'inject-bundle.js')

interface WebmcpTool {
  name?: string
  description?: string
}

interface CliResult {
  success?: boolean
  url?: string
  title?: string
  tabid?: string
  webmcpTools?: WebmcpTool[]
  content?: Array<{ type?: string; text?: string }> | unknown
  text?: string
  error?: unknown
  [key: string]: unknown
}

/** 从混有 CDP 日志的 stdout 中提取第一个顶层 JSON 对象（CLI 结果；勿取 tabs 内嵌对象） */
function extractJson(stdout: string): CliResult {
  const text = String(stdout || '')
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue
    if (i > 0 && text[i - 1] !== '\n' && text[i - 1] !== '\r' && !/\s/.test(text[i - 1])) {
      continue
    }
    let depth = 0
    let inString = false
    let escape = false
    for (let j = i; j < text.length; j++) {
      const ch = text[j]
      if (inString) {
        if (escape) escape = false
        else if (ch === '\\') escape = true
        else if (ch === '"') inString = false
        continue
      }
      if (ch === '"') {
        inString = true
        continue
      }
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          const slice = text.slice(i, j + 1)
          try {
            return JSON.parse(slice) as CliResult
          } catch {
            break
          }
        }
      }
    }
  }
  throw new Error(`stdout 中未找到合法 JSON：\n${text.slice(-800)}`)
}

function httpGet(url: string, timeoutMs = 1500): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => {
        data += chunk.toString()
      })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('request timeout'))
    })
  })
}

describe('webmcp-cli browser e2e', () => {
  const workspace = mkdtempSync(path.join(os.tmpdir(), 'webmcp-cli-e2e-'))
  const cdpPort = 9300 + Math.floor(Math.random() * 400)
  const cliEnv = {
    ...process.env,
    WEBMCP_WORKSPACE: workspace,
    WEBMCP_CDP_PORT: String(cdpPort),
    WEBMCP_HEADLESS: '1',
  }

  let openedTabId = ''

  function runCli(args: string[], timeoutMs = 90_000): { stdout: string; stderr: string; json: CliResult } {
    const result = spawnSync(process.execPath, [binPath, ...args], {
      env: cliEnv,
      encoding: 'utf-8',
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    })
    const stdout = result.stdout || ''
    const stderr = result.stderr || ''
    if (result.error) {
      throw result.error
    }
    if (result.status !== 0) {
      throw new Error(
        `exit ${result.status}\nstdout:\n${stdout.slice(-1500)}\nstderr:\n${stderr.slice(-1500)}`
      )
    }
    return { stdout, stderr, json: extractJson(stdout) }
  }

  beforeAll(() => {
    if (!existsSync(binPath) || !existsSync(injectPath)) {
      throw new Error('缺少 dist/bin.js 或 dist/inject-bundle.js，请先执行 pnpm build')
    }
  })

  afterAll(async () => {
    const bases = [
      `http://127.0.0.1:${cdpPort}`,
      `http://[::1]:${cdpPort}`,
      `http://localhost:${cdpPort}`,
    ]
    for (const base of bases) {
      try {
        await httpGet(`${base}/json/version`, 800)
        const browser = await puppeteer.connect({ browserURL: base, defaultViewport: null })
        await browser.close()
        break
      } catch {
        // try next
      }
    }
    try {
      rmSync(workspace, { recursive: true, force: true })
    } catch {
      // ignore
    }
  })

  it('tabs open example.com', () => {
    const { json } = runCli(['tabs', 'open', 'https://example.com'])
    expect(json.success).toBe(true)
    expect(String(json.url || '')).toContain('example.com')
    expect(typeof json.tabid).toBe('string')
    openedTabId = json.tabid as string
  })

  it('state includes page-agent-tool', () => {
    expect(openedTabId).toBeTruthy()
    const { json } = runCli(['state', '-t', openedTabId])
    const tools = Array.isArray(json.webmcpTools) ? json.webmcpTools : []
    const names = tools.map((t) => t.name)
    expect(names).toContain('page-agent-tool')
    expect(String(json.url || '')).toContain('example.com')
  })

  it('run page-agent-tool browserState', () => {
    expect(openedTabId).toBeTruthy()
    const { json } = runCli([
      'run',
      'page-agent-tool',
      JSON.stringify({ action: 'browserState', responseMode: 'full' }),
      '-t',
      openedTabId,
    ])
    expect(json.error).toBeUndefined()
    const content = json.content
    const hasArrayContent = Array.isArray(content) && content.length > 0
    const hasFlatText = typeof json.text === 'string' && json.text.includes('浏览器状态')
    expect(hasArrayContent || hasFlatText).toBe(true)
  })
})
