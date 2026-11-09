import { chmodSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { constants } from 'node:os'
import { spawn, type IPty } from 'node-pty'
import { resolveShell } from './bash-executor.js'

export interface HostPtyExit {
  exitCode: number | null
  signal: string | null
}

export interface HostPty {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
  onData(cb: (data: string) => void): void
  onExit(cb: (info: HostPtyExit) => void): void
}

export interface SpawnHostPtyOptions {
  cwd: string
  cols: number
  rows: number
  shell?: string
}

function interactiveArgs(shell: string): string[] {
  if (process.platform !== 'win32') return ['-i']
  const base = path.basename(shell).toLowerCase()
  if (base === 'powershell.exe' || base === 'pwsh.exe') return ['-NoLogo']
  if (base === 'cmd.exe') return []
  return ['-i']
}

function ptyEnvironment(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value
  }
  env.TERM = 'xterm-256color'
  return env
}

function ensureSpawnHelper(): void {
  if (process.platform === 'win32') return
  try {
    const pkgJson = createRequire(import.meta.url).resolve('node-pty/package.json')
    const helper = path.join(
      path.dirname(pkgJson),
      'prebuilds',
      `${process.platform}-${process.arch}`,
      'spawn-helper'
    )
    // 发布包里的 spawn-helper 是 0644，posix_spawnp 会直接失败
    if (existsSync(helper)) chmodSync(helper, 0o755)
  } catch {
    // 找不到预编译文件时，交给后面的 spawn 报出启动失败
  }
}

function signalName(code: number | undefined): string | null {
  if (!code) return null
  for (const [name, value] of Object.entries(constants.signals)) {
    if (value === code) return name
  }
  return String(code)
}

export function spawnHostPty(options: SpawnHostPtyOptions): HostPty {
  ensureSpawnHelper()
  const shell = options.shell || resolveShell()
  const pending: string[] = []
  let dataCb: ((data: string) => void) | null = null
  let exitCb: ((info: HostPtyExit) => void) | null = null
  let pendingExit: HostPtyExit | null = null
  let settled = false
  let term: IPty | null = null

  const emitData = (data: string) => {
    if (!data) return
    if (dataCb) dataCb(data)
    else pending.push(data)
  }

  const finish = (info: HostPtyExit) => {
    if (settled) return
    settled = true
    if (exitCb) exitCb(info)
    else pendingExit = info
  }

  try {
    term = spawn(shell, interactiveArgs(shell), {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd,
      env: ptyEnvironment()
    })
    term.onData((data) => emitData(data))
    term.onExit((event) => {
      finish({ exitCode: event.exitCode, signal: signalName(event.signal) })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    emitData(`\r\n[终端启动失败] ${message}\r\n`)
    finish({ exitCode: null, signal: null })
  }

  return {
    write(data: string) {
      try {
        term?.write(data)
      } catch {
        // 进程已退出
      }
    },
    resize(cols: number, rows: number) {
      try {
        term?.resize(cols, rows)
      } catch {
        // 进程已退出
      }
    },
    kill() {
      try {
        term?.kill()
      } catch {
        // 进程已退出
      }
    },
    onData(cb) {
      dataCb = cb
      for (const chunk of pending) cb(chunk)
      pending.length = 0
    },
    onExit(cb) {
      exitCb = cb
      if (pendingExit) cb(pendingExit)
    }
  }
}
