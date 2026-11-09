import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
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

const PTY_HELPER = `
import errno, fcntl, json, os, pty, select, signal, struct, sys, termios

shell = os.environ.get("TERMINAL_SHELL") or "/bin/bash"
rows = int(os.environ.get("TERMINAL_ROWS") or "24")
cols = int(os.environ.get("TERMINAL_COLS") or "80")
control_fd = 3

def set_winsize(fd, next_rows, next_cols):
    winsize = struct.pack("HHHH", int(next_rows), int(next_cols), 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)

pid, master = pty.fork()
if pid == 0:
    try:
        os.close(control_fd)
    except OSError:
        pass
    os.environ["TERM"] = "xterm-256color"
    try:
        os.execvp(shell, [shell, "-i"])
    except OSError:
        os._exit(127)

def control_loop():
    try:
        reader = os.fdopen(control_fd, "r", buffering=1, encoding="utf-8", errors="replace")
    except OSError:
        return
    for line in reader:
        text = line.strip()
        if not text:
            continue
        try:
            msg = json.loads(text)
        except json.JSONDecodeError:
            continue
        kind = msg.get("type")
        if kind == "resize":
            try:
                set_winsize(master, msg.get("rows") or rows, msg.get("cols") or cols)
                os.kill(pid, signal.SIGWINCH)
            except OSError:
                pass
        elif kind == "kill":
            try:
                os.kill(pid, signal.SIGHUP)
            except OSError:
                pass
            os._exit(0)

import threading
threading.Thread(target=control_loop, daemon=True).start()

try:
    set_winsize(master, rows, cols)
except OSError:
    pass

stdin_fd = sys.stdin.fileno()
stdout_fd = sys.stdout.fileno()

while True:
    try:
        readable, _, _ = select.select([master, stdin_fd], [], [])
    except InterruptedError:
        continue
    if master in readable:
        try:
            data = os.read(master, 65536)
        except OSError as err:
            if err.errno == errno.EIO:
                break
            raise
        if not data:
            break
        os.write(stdout_fd, data)
    if stdin_fd in readable:
        try:
            data = os.read(stdin_fd, 65536)
        except OSError:
            break
        if not data:
            break
        try:
            os.write(master, data)
        except OSError:
            break

try:
    _, status = os.waitpid(pid, 0)
except ChildProcessError:
    status = 0
code = os.waitstatus_to_exitcode(status)
os._exit(0 if code < 0 else code)
`

export function spawnHostPty(options: SpawnHostPtyOptions): HostPty {
  if (process.platform === 'win32') {
    throw new Error('当前平台暂不支持交互式终端')
  }

  const shell = options.shell || resolveShell()
  const child = spawn('python3', ['-u', '-c', PTY_HELPER], {
    cwd: options.cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      TERMINAL_SHELL: shell,
      TERMINAL_ROWS: String(options.rows),
      TERMINAL_COLS: String(options.cols)
    },
    stdio: ['pipe', 'pipe', 'pipe', 'pipe']
  }) as ChildProcessWithoutNullStreams

  const pending: string[] = []
  let dataCb: ((data: string) => void) | null = null
  let exitCb: ((info: HostPtyExit) => void) | null = null
  let pendingExit: HostPtyExit | null = null
  let settled = false
  const decoder = new TextDecoder('utf-8', { fatal: false })
  let stderrText = ''

  const emitData = (data: string) => {
    if (!data) return
    if (dataCb) dataCb(data)
    else pending.push(data)
  }

  const finish = (info: HostPtyExit) => {
    if (settled) return
    settled = true
    if (stderrText.trim()) emitData(`\r\n${stderrText.trim()}\r\n`)
    if (exitCb) exitCb(info)
    else pendingExit = info
  }

  child.stdout.on('data', (buf: Buffer) => {
    emitData(decoder.decode(buf, { stream: true }))
  })
  child.stderr.on('data', (buf: Buffer) => {
    stderrText += buf.toString('utf8')
  })
  child.on('error', (err) => {
    emitData(`\r\n[终端启动失败] ${err.message}\r\n`)
    finish({ exitCode: null, signal: null })
  })
  child.on('exit', (code, signal) => {
    const rest = decoder.decode()
    if (rest) emitData(rest)
    finish({ exitCode: code, signal: signal ?? null })
  })

  const control = child.stdio[3]
  const writeControl = (payload: Record<string, unknown>) => {
    if (!control || !('write' in control)) return
    try {
      ;(control as NodeJS.WritableStream).write(`${JSON.stringify(payload)}\n`)
    } catch {
      // 控制通道已关闭
    }
  }

  return {
    write(data: string) {
      try {
        child.stdin.write(data)
      } catch {
        // 进程已退出
      }
    },
    resize(cols: number, rows: number) {
      writeControl({ type: 'resize', cols, rows })
    },
    kill() {
      writeControl({ type: 'kill' })
      try {
        child.kill('SIGTERM')
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
