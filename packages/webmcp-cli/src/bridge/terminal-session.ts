import { randomUUID } from 'node:crypto'
import { BashInvalidParamsError, resolveWorkspaceDir, type WorkspaceResolveParams } from './workspace-manager.js'
import { spawnHostPty, type HostPty } from './pty-backend.js'
import { TERMINAL_EVENTS } from './protocol.js'

const OUTPUT_CHUNK = 32 * 1024
const MAX_INPUT = 64 * 1024
const DEFAULT_COALESCE_MS = 16
export const TERMINAL_OUTPUT_HIGH_WATER = 1024 * 1024

export function applyTerminalBackpressure(
  bufferedAmount: number,
  flow: { pauseOutput(): void; resumeOutput(): void }
): void {
  if (bufferedAmount > TERMINAL_OUTPUT_HIGH_WATER) flow.pauseOutput()
  else if (bufferedAmount <= TERMINAL_OUTPUT_HIGH_WATER / 2) flow.resumeOutput()
}

export interface TerminalNotificationFrame {
  jsonrpc: '2.0'
  method: (typeof TERMINAL_EVENTS)[keyof typeof TERMINAL_EVENTS]
  params: Record<string, unknown>
}

export interface TerminalSpawnOptions {
  cwd: string
  cols: number
  rows: number
}

export type TerminalPtySpawn = (options: TerminalSpawnOptions) => HostPty

export interface TerminalSessionManagerOptions {
  send: (frame: TerminalNotificationFrame) => void
  spawnPty?: TerminalPtySpawn
  coalesceMs?: number
}

export interface TerminalOpenParams extends WorkspaceResolveParams {
  cols?: number
  rows?: number
}

function clampDimension(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(2, Math.min(500, Math.floor(parsed)))
}

export class TerminalSessionManager {
  private session: { id: string; pty: HostPty; cwd: string } | null = null
  private buffer = ''
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly send: (frame: TerminalNotificationFrame) => void
  private readonly spawnPty: TerminalPtySpawn
  private readonly coalesceMs: number

  constructor(options: TerminalSessionManagerOptions) {
    this.send = options.send
    this.spawnPty = options.spawnPty ?? ((opts) => spawnHostPty(opts))
    this.coalesceMs = options.coalesceMs ?? DEFAULT_COALESCE_MS
  }

  open(params: TerminalOpenParams = {}): { sessionId: string; cwd: string } {
    const cwd = resolveWorkspaceDir(params)
    const cols = clampDimension(params.cols, 80)
    const rows = clampDimension(params.rows, 24)
    this.closeActive()

    const id = randomUUID()
    const pty = this.spawnPty({ cwd, cols, rows })
    this.session = { id, pty, cwd }
    pty.onData((data) => this.pushOutput(id, data))
    pty.onExit((info) => {
      if (this.session?.id !== id) return
      this.flush(id)
      this.session = null
      this.send({
        jsonrpc: '2.0',
        method: TERMINAL_EVENTS.EXIT,
        params: {
          sessionId: id,
          exitCode: info.exitCode,
          signal: info.signal
        }
      })
    })
    return { sessionId: id, cwd }
  }

  input(params: { sessionId?: string; data?: unknown }): { ok: true } {
    const session = this.requireSession(params.sessionId)
    if (typeof params.data !== 'string') {
      throw new BashInvalidParamsError('data 必须是字符串')
    }
    if (params.data.length > MAX_INPUT) {
      throw new BashInvalidParamsError('单次输入过长')
    }
    session.pty.write(params.data)
    return { ok: true }
  }

  resize(params: { sessionId?: string; cols?: number; rows?: number }): { ok: true } {
    const session = this.requireSession(params.sessionId)
    session.pty.resize(clampDimension(params.cols, 80), clampDimension(params.rows, 24))
    return { ok: true }
  }

  close(params: { sessionId?: string } = {}): { ok: true } {
    if (!this.session || (params.sessionId && params.sessionId !== this.session.id)) {
      return { ok: true }
    }
    this.closeActive()
    return { ok: true }
  }

  disposeAll(): void {
    this.closeActive()
  }

  pauseOutput(): void {
    try {
      this.session?.pty.pause()
    } catch {
      // 进程已退出
    }
  }

  resumeOutput(): void {
    try {
      this.session?.pty.resume()
    } catch {
      // 进程已退出
    }
  }

  private requireSession(sessionId?: string): { id: string; pty: HostPty; cwd: string } {
    if (!this.session || !sessionId || sessionId !== this.session.id) {
      throw new Error('终端会话不存在')
    }
    return this.session
  }

  private closeActive(): void {
    const current = this.session
    this.session = null
    this.buffer = ''
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    current?.pty.kill()
  }

  private pushOutput(sessionId: string, chunk: string): void {
    if (this.session?.id !== sessionId || !chunk) return
    this.buffer += chunk
    this.flushFullChunks(sessionId)
    if (!this.buffer) return
    if (this.coalesceMs <= 0) {
      this.flush(sessionId)
      return
    }
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(sessionId), this.coalesceMs)
    }
  }

  private flushFullChunks(sessionId: string): void {
    while (this.buffer.length >= OUTPUT_CHUNK) {
      const data = this.buffer.slice(0, OUTPUT_CHUNK)
      this.buffer = this.buffer.slice(OUTPUT_CHUNK)
      this.emitOutput(sessionId, data)
    }
  }

  private flush(sessionId: string): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (!this.buffer || this.session?.id !== sessionId) {
      this.buffer = ''
      return
    }
    const data = this.buffer
    this.buffer = ''
    this.emitOutput(sessionId, data)
  }

  private emitOutput(sessionId: string, data: string): void {
    this.send({
      jsonrpc: '2.0',
      method: TERMINAL_EVENTS.OUTPUT,
      params: { sessionId, data }
    })
  }
}
