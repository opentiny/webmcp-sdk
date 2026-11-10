import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BashInvalidParamsError } from '../src/bridge/workspace-manager.js'
import {
  TerminalSessionManager,
  applyTerminalBackpressure,
  TERMINAL_OUTPUT_HIGH_WATER
} from '../src/bridge/terminal-session.js'
import type { HostPty, HostPtyExit } from '../src/bridge/pty-backend.js'
import { TERMINAL_EVENTS } from '../src/bridge/protocol.js'

class FakePty implements HostPty {
  writes: string[] = []
  sizes: Array<[number, number]> = []
  killed = false
  paused = false
  private dataCb: ((data: string) => void) | null = null
  private exitCb: ((info: HostPtyExit) => void) | null = null

  write(data: string): void {
    this.writes.push(data)
  }

  resize(cols: number, rows: number): void {
    this.sizes.push([cols, rows])
  }

  kill(): void {
    if (this.killed) return
    this.killed = true
    this.exitCb?.({ exitCode: 0, signal: null })
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
  }

  onData(cb: (data: string) => void): void {
    this.dataCb = cb
  }

  onExit(cb: (info: HostPtyExit) => void): void {
    this.exitCb = cb
  }

  emit(data: string): void {
    this.dataCb?.(data)
  }

  exit(info: HostPtyExit): void {
    this.exitCb?.(info)
  }
}

describe('TerminalSessionManager', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function createManager() {
    const frames: Array<{ method: string; params: Record<string, unknown> }> = []
    const created: FakePty[] = []
    const root = mkdtempSync(path.join(tmpdir(), 'terminal-session-'))
    const manager = new TerminalSessionManager({
      coalesceMs: 0,
      send: (frame) => frames.push({ method: frame.method, params: frame.params }),
      spawnPty: () => {
        const pty = new FakePty()
        created.push(pty)
        return pty
      }
    })
    return { manager, frames, root, created }
  }

  it('打开会话后把 PTY 输出按帧推回，并返回解析后的 cwd', () => {
    const { manager, frames, root, created } = createManager()
    const opened = manager.open({ workspacePath: root, cols: 100, rows: 30 })

    expect(opened.cwd).toBe(root)
    expect(opened.sessionId).toBeTruthy()
    created[0].emit('hello')

    expect(frames).toEqual([
      {
        method: TERMINAL_EVENTS.OUTPUT,
        params: { sessionId: opened.sessionId, data: 'hello' }
      }
    ])
  })

  it('把输入和窗口尺寸交给当前 PTY，并在退出时推送 exit', () => {
    const { manager, frames, root, created } = createManager()
    const opened = manager.open({ workspacePath: root })

    expect(manager.input({ sessionId: opened.sessionId, data: 'ls\n' })).toEqual({ ok: true })
    expect(manager.resize({ sessionId: opened.sessionId, cols: 120, rows: 40 })).toEqual({ ok: true })
    expect(created[0].writes).toEqual(['ls\n'])
    expect(created[0].sizes).toEqual([[120, 40]])

    created[0].exit({ exitCode: 2, signal: null })
    expect(frames.at(-1)).toEqual({
      method: TERMINAL_EVENTS.EXIT,
      params: { sessionId: opened.sessionId, exitCode: 2, signal: null }
    })
  })

  it('拒绝逃出工作空间的 cwd，并拒绝未知会话的输入', () => {
    const { manager, root } = createManager()
    expect(() => manager.open({ workspacePath: root, cwd: '../outside' })).toThrow(BashInvalidParamsError)

    const opened = manager.open({ workspacePath: root })
    expect(() => manager.input({ sessionId: 'missing', data: 'x' })).toThrow('终端会话不存在')
    expect(() => manager.input({ sessionId: opened.sessionId, data: 1 as unknown as string })).toThrow(
      BashInvalidParamsError
    )
  })

  it('再次打开会结束上一会话，关闭未知会话视为成功', () => {
    const { manager, root, created } = createManager()
    manager.open({ workspacePath: root })
    const second = manager.open({ workspacePath: root })

    expect(created[0].killed).toBe(true)
    expect(second.sessionId).not.toBe('')
    expect(manager.close({ sessionId: 'missing' })).toEqual({ ok: true })
    expect(created[1].killed).toBe(false)
    expect(manager.close({ sessionId: second.sessionId })).toEqual({ ok: true })
    expect(created[1].killed).toBe(true)
  })

  it('复现：socket 积压超过上限时暂停读取，降到一半以下后恢复', () => {
    const { manager, root, created } = createManager()
    manager.open({ workspacePath: root })
    applyTerminalBackpressure(TERMINAL_OUTPUT_HIGH_WATER + 1, manager)
    expect(created[0].paused).toBe(true)
    applyTerminalBackpressure(TERMINAL_OUTPUT_HIGH_WATER / 2, manager)
    expect(created[0].paused).toBe(false)
  })

  it('超过 32KB 的输出拆成多帧', () => {
    const { manager, frames, root, created } = createManager()
    const opened = manager.open({ workspacePath: root })
    created[0].emit('a'.repeat(32 * 1024 + 10))

    expect(frames).toHaveLength(2)
    expect(frames[0].params.data).toHaveLength(32 * 1024)
    expect(frames[1].params).toMatchObject({ sessionId: opened.sessionId, data: 'a'.repeat(10) })
  })
})
