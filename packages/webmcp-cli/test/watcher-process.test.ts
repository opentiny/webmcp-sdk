import { describe, expect, it } from 'vitest'
import fs from 'fs'
import {
  clearWatcherPid,
  getWatcherPidPath,
  isInjectableUrl,
  isProcessAlive,
  readWatcherPid,
  shouldHandoffWatcherForForeground,
  shouldPrepareWatcherUrl,
  writeWatcherPid,
} from '../src/watcher-process'

describe('watcher-process helpers', () => {
  it('isInjectableUrl 允许 http(s) / blank / newtab', () => {
    expect(isInjectableUrl('https://example.com')).toBe(true)
    expect(isInjectableUrl('http://localhost:3000')).toBe(true)
    expect(isInjectableUrl('about:blank')).toBe(true)
    expect(isInjectableUrl('')).toBe(true)
    expect(isInjectableUrl('chrome://newtab/')).toBe(true)
    expect(isInjectableUrl('chrome://settings')).toBe(false)
    expect(isInjectableUrl('devtools://foo')).toBe(false)
  })

  it('shouldPrepareWatcherUrl 对 newtab 为 true，对 settings 为 false', () => {
    expect(shouldPrepareWatcherUrl('chrome://newtab/')).toBe(true)
    expect(shouldPrepareWatcherUrl('chrome://new-tab-page/')).toBe(true)
    expect(shouldPrepareWatcherUrl('about:blank')).toBe(true)
    expect(shouldPrepareWatcherUrl('https://a.com')).toBe(true)
    expect(shouldPrepareWatcherUrl('chrome://settings/')).toBe(false)
    expect(shouldPrepareWatcherUrl('devtools://x')).toBe(false)
  })

  it('isProcessAlive 对当前进程返回 true', () => {
    expect(isProcessAlive(process.pid)).toBe(true)
    expect(isProcessAlive(-1)).toBe(false)
    expect(isProcessAlive(0)).toBe(false)
  })

  it('复现：Windows watcher 长连接导致第二次 CLI 连接超时 —— 前置 watcher 已连接；步骤前台命令连接；期望先交接 CDP 连接', () => {
    expect(shouldHandoffWatcherForForeground('win32')).toBe(true)
    expect(shouldHandoffWatcherForForeground('darwin')).toBe(false)
    expect(shouldHandoffWatcherForForeground('linux')).toBe(false)
  })

  it('复现：clearWatcherPid 仅删除仍指向 expectedPid 的文件 —— 前置写入 pidA；步骤 clearWatcherPid(pidB)；期望文件仍在', () => {
    const prev = process.env.WEBMCP_WORKSPACE
    const tmp = fs.mkdtempSync('/tmp/webmcp-watcher-pid-')
    process.env.WEBMCP_WORKSPACE = tmp
    try {
      writeWatcherPid(11111)
      expect(readWatcherPid()).toBe(11111)
      clearWatcherPid(22222)
      expect(readWatcherPid()).toBe(11111)
      clearWatcherPid(11111)
      expect(readWatcherPid()).toBeNull()
      expect(fs.existsSync(getWatcherPidPath())).toBe(false)
    } finally {
      if (prev === undefined) delete process.env.WEBMCP_WORKSPACE
      else process.env.WEBMCP_WORKSPACE = prev
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
