import { spawn, exec } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { resolveOrCreateAuthToken, ExtensionBridgeClient, getKillPortHint } from './bridge-client.js'

const execAsync = promisify(exec)

const WS_PORT = 18999
const DAEMON_DIR = path.join(os.homedir(), '.robot-wxt')
const PID_FILE = path.join(DAEMON_DIR, 'daemon.pid')

/** 检查指定 PID 的进程是否存活 */
export function isProcessAlive(pid: number): boolean {
  if (!pid || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** 跨平台根据端口探测占用该端口的 PID */
export async function findPidByPort(port: number, excludePid?: number): Promise<number | null> {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync('netstat -ano -p tcp')
      const lines = stdout.split(/\r?\n/)
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.toUpperCase().startsWith('TCP')) continue
        const parts = line.split(/\s+/)
        if (parts.length < 5) continue
        const localAddr = parts[1]
        const state = parts[3]?.toUpperCase() || ''
        const pid = parseInt(parts[parts.length - 1], 10)

        if (!pid || isNaN(pid) || (excludePid && pid === excludePid)) continue

        if (localAddr.endsWith(`:${port}`)) {
          if (state.includes('LISTEN') || state.includes('侦听')) {
            return pid
          }
        }
      }
      return null
    } catch {
      return null
    }
  }

  try {
    const { stdout } = await execAsync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`)
    const pids = stdout
      .trim()
      .split('\n')
      .map((p) => parseInt(p.trim(), 10))
      .filter((p) => Boolean(p && !isNaN(p) && (!excludePid || p !== excludePid)))
    return pids[0] ?? null
  } catch {
    return null
  }
}

/** 跨平台终止指定 PID 及其子进程树 */
export async function killProcessTree(pid: number): Promise<boolean> {
  if (!pid || pid <= 0 || pid === process.pid) return false

  if (process.platform === 'win32') {
    try {
      await execAsync(`taskkill /pid ${pid} /T /F`)
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // ignore
      }
    }
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 100))
      if (!isProcessAlive(pid)) return true
    }
    return !isProcessAlive(pid)
  }

  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // ignore
  }

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 100))
    if (!isProcessAlive(pid)) return true
  }

  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // ignore
  }

  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 100))
    if (!isProcessAlive(pid)) return true
  }

  return !isProcessAlive(pid)
}

/** 强杀占用指定端口的进程以释放端口 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  const pid = await findPidByPort(port, process.pid)
  if (pid) {
    await killProcessTree(pid)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const remainingPid = await findPidByPort(port, process.pid)
      if (!remainingPid) return true
    }
  }
  return false
}

/** 探测指定端口的 WS 桥接服务是否已就绪且鉴权通过 */
export async function probeServerReady(
  port: number = WS_PORT,
  token?: string,
  timeoutMs: number = 1000
): Promise<{ running: boolean; authed: boolean; error?: string }> {
  return ExtensionBridgeClient.probe(port, token ?? resolveOrCreateAuthToken(), timeoutMs)
}

/** 检查受管的后台守护进程是否存活 */
export function isDaemonProcessAlive(): boolean {
  if (!fs.existsSync(PID_FILE)) return false
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10)
    return Boolean(pid && isProcessAlive(pid))
  } catch {
    return false
  }
}

/** 确保 18999 桥接后台服务在运行，若未运行则自动拉起常驻守护进程 */
export async function ensureBridgeDaemon(
  options: { port?: number; token?: string; timeoutMs?: number; silent?: boolean } = {}
): Promise<{ newlyStarted: boolean }> {
  const port = options.port ?? WS_PORT
  const token = options.token ?? resolveOrCreateAuthToken()
  const timeoutMs = options.timeoutMs ?? 6000

  // 1. 先探测是否已有服务
  const probe = await probeServerReady(port, token, 800)
  if (probe.running && probe.authed) {
    // 已经有正常工作的服务，直接复用
    return { newlyStarted: false }
  }

  if (probe.running && !probe.authed) {
    if (!options.silent) {
      console.log(
        `\x1b[33m[webmcp-cli]\x1b[0m 🔄 检测到后台桥接服务 Token 不匹配，正在自动停止旧服务并重启以应用新 Token...`
      )
    }
    const stopped = await stopBridgeDaemon(port)
    if (!stopped) {
      const killTip = getKillPortHint(port)
      throw new Error(
        `本地 127.0.0.1:${port} 正在运行旧的桥接服务，但认证未通过（${probe.error || 'Token 不匹配'}）。\n` +
          `自动停止旧服务失败，请手动终止占用该端口的进程（可执行: ${killTip}）。`
      )
    }
    await new Promise((r) => setTimeout(r, 400))
  }

  // 2. 启动后台常驻进程
  if (!options.silent) {
    console.log(`\x1b[36m[webmcp-cli]\x1b[0m 🚀 本地桥接服务未运行，正在自动拉起常驻服务 (127.0.0.1:${port})...`)
  }
  startDaemonProcessBackground(token, port)

  // 3. 轮询等待服务就绪
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    await new Promise((r) => setTimeout(r, 200))
    const check = await probeServerReady(port, token, 400)
    if (check.running && check.authed) {
      if (!options.silent) {
        console.log(`\x1b[32m[webmcp-cli]\x1b[0m ✅ 桥接服务已启动，正在等待 Chrome 扩展连接...`)
      }
      return { newlyStarted: true }
    }
  }

  throw new Error(`启动后台 WebSocket 桥接服务超时（${timeoutMs}ms），请检查端口 ${port} 是否可用。`)
}

function resolveCliEntry(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  // webmcp-cli 产物入口为 bin.js
  const distCandidate = path.join(currentDir, 'bin.js')
  if (fs.existsSync(distCandidate)) return distCandidate

  const projectDistCandidate = path.resolve(currentDir, '../dist/bin.js')
  if (fs.existsSync(projectDistCandidate)) return projectDistCandidate

  return distCandidate
}

/** 在后台派生守护进程 */
function startDaemonProcessBackground(token: string, port: number): void {
  const cliEntry = resolveCliEntry()
  if (!fs.existsSync(DAEMON_DIR)) {
    fs.mkdirSync(DAEMON_DIR, { mode: 0o700, recursive: true })
  }

  const child = spawn(process.execPath, [cliEntry, '--mode', 'wxt', 'daemon', '--port', String(port)], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: {
      ...process.env,
      ROBOT_WXT_BRIDGE_TOKEN: token
    }
  })

  child.unref()
}

/** 守护进程主循环（由 `webmcp-cli --mode wxt daemon` 调用） */
export async function runDaemonProcess(args: string[]): Promise<void> {
  let port = WS_PORT
  let token: string | undefined

  const portIdx = args.indexOf('--port')
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = parseInt(args[portIdx + 1], 10)
  }
  const tokenIdx = args.indexOf('--token')
  if (tokenIdx !== -1 && args[tokenIdx + 1]) {
    token = args[tokenIdx + 1]
  } else if (process.env.ROBOT_WXT_BRIDGE_TOKEN) {
    token = process.env.ROBOT_WXT_BRIDGE_TOKEN
  }

  const client = new ExtensionBridgeClient(port, token)

  client.on('error', (err: any) => {
    if (err && (err.code === 'EADDRINUSE' || err.message?.includes('EADDRINUSE'))) {
      process.exit(1)
    }
  })

  // 成功开始监听端口后再写入 PID 文件，防止端口占用导致留下死 PID 文件
  client.on('listening', () => {
    try {
      if (!fs.existsSync(DAEMON_DIR)) {
        fs.mkdirSync(DAEMON_DIR, { mode: 0o700, recursive: true })
      }
      fs.writeFileSync(PID_FILE, String(process.pid), { mode: 0o600, encoding: 'utf8' })
    } catch {
      // ignore
    }
  })

  client.connect()

  const shutdown = () => {
    try {
      if (fs.existsSync(PID_FILE)) {
        const recordedPid = fs.readFileSync(PID_FILE, 'utf8').trim()
        if (recordedPid === String(process.pid)) {
          fs.unlinkSync(PID_FILE)
        }
      }
    } catch {
      // ignore
    }
    client.destroy()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('exit', shutdown)

  // 保持进程常驻
  setInterval(() => {}, 60_000)
}

/** 停止后台运行的桥接服务 */
export async function stopBridgeDaemon(port: number = WS_PORT): Promise<boolean> {
  let killedAny = false

  // 1. 若停止的是默认守护进程端口且记录了 PID，先尝试根据 PID 关闭进程树
  if (port === WS_PORT && fs.existsSync(PID_FILE)) {
    try {
      const pidStr = fs.readFileSync(PID_FILE, 'utf8').trim()
      const pid = parseInt(pidStr, 10)
      if (pid && isProcessAlive(pid)) {
        const killed = await killProcessTree(pid)
        if (killed) killedAny = true
      }
    } catch {
      // ignore
    } finally {
      try {
        if (fs.existsSync(PID_FILE)) {
          fs.unlinkSync(PID_FILE)
        }
      } catch {
        // ignore
      }
    }
  }

  // 2. 检查端口是否有进程占用（包括旧常驻服务或僵死服务），按端口强杀释放
  const portPid = await findPidByPort(port, process.pid)
  if (portPid) {
    const killedByPort = await killProcessOnPort(port)
    if (killedByPort) {
      killedAny = true
    }
  }

  // 3. 循环确认端口是否已被释放（最多等待 2 秒）
  let portReleased = false
  for (let i = 0; i < 10; i++) {
    const remainingPid = await findPidByPort(port, process.pid)
    if (!remainingPid) {
      portReleased = true
      break
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  // 若端口未能成功释放，说明终止失败
  if (!portReleased) {
    return false
  }

  return killedAny
}
