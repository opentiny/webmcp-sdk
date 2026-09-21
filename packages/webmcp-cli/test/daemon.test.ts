import { describe, it, expect, afterEach } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { ExtensionBridgeClient } from '../src/bridge/bridge-client.js'
import { probeServerReady, isProcessAlive, findPidByPort, stopBridgeDaemon } from '../src/bridge/daemon.js'

describe('daemon unit tests', () => {
  let serverClient: ExtensionBridgeClient | null = null
  let childProc: ChildProcess | null = null

  afterEach(() => {
    if (serverClient) {
      serverClient.destroy()
      serverClient = null
    }
    if (childProc) {
      try {
        childProc.kill('SIGKILL')
      } catch {
        // ignore
      }
      childProc = null
    }
  })

  it('isProcessAlive 正确识别进程存活状态', () => {
    expect(isProcessAlive(process.pid)).toBe(true)
    expect(isProcessAlive(99999999)).toBe(false)
  })

  it('端口无服务时 probeServerReady 返回 running=false', async () => {
    const res = await probeServerReady(19876, 'test-token', 300)
    expect(res.running).toBe(false)
    expect(res.authed).toBe(false)
  })

  it('端口有服务且 Token 匹配时 probeServerReady 返回 running=true, authed=true', async () => {
    const testPort = 19877
    const token = 'valid-daemon-token-1234567890abcdef'
    serverClient = new ExtensionBridgeClient(testPort, token)
    serverClient.connect()
    await new Promise((r) => setTimeout(r, 50))

    const res = await probeServerReady(testPort, token, 1500)
    expect(res.running).toBe(true)
    expect(res.authed).toBe(true)
  })

  it('端口有服务但 Token 不匹配时 probeServerReady 返回 running=true, authed=false', async () => {
    const testPort = 19878
    const serverToken = 'server-token-11111111111111111111'
    const wrongToken = 'wrong-token-22222222222222222222'
    serverClient = new ExtensionBridgeClient(testPort, serverToken)
    serverClient.connect()
    await new Promise((r) => setTimeout(r, 50))

    const res = await probeServerReady(testPort, wrongToken, 1500)
    expect(res.running).toBe(true)
    expect(res.authed).toBe(false)
  })

  it('findPidByPort 应能识别监听中的测试端口 PID', async () => {
    const testPort = 19879
    serverClient = new ExtensionBridgeClient(testPort, 'test-token')
    serverClient.connect()
    await new Promise((r) => setTimeout(r, 100))

    const pid = await findPidByPort(testPort)
    expect(pid).toBe(process.pid)
  })

  it('当端口无运行中服务时 stopBridgeDaemon 返回 false', async () => {
    const testPort = 19890
    const stopped = await stopBridgeDaemon(testPort)
    expect(stopped).toBe(false)
  })

  it('stopBridgeDaemon 能强杀占用端口的独立进程并释放端口', async () => {
    const testPort = 19880
    childProc = spawn(
      process.execPath,
      [
        '-e',
        `import('node:http').then(({ createServer }) => {
          const s = createServer((req, res) => res.end('ok'))
          s.listen(${testPort}, '127.0.0.1', () => {
            setInterval(() => {}, 1000)
          })
        })`
      ],
      { stdio: 'ignore' }
    )

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const pid = await findPidByPort(testPort)
      if (pid) break
    }

    const pidBefore = await findPidByPort(testPort)
    expect(pidBefore).toBe(childProc.pid)

    const stopped = await stopBridgeDaemon(testPort)
    expect(stopped).toBe(true)

    const pidAfter = await findPidByPort(testPort)
    expect(pidAfter).toBeNull()
  })

  it('端口上存在客户端连接时不得误杀客户端，且 findPidByPort 仅返回服务端', async () => {
    const testPort = 19881
    let clientProc: ChildProcess | null = null
    try {
      // 1. 先启动独立客户端进程并循环重试连接该端口（确保客户端先启动，clientProc.pid < childProc.pid）
      clientProc = spawn(
        process.execPath,
        [
          '-e',
          `import('node:net').then(({ connect }) => {
            const tryConnect = () => {
              const socket = connect(${testPort}, '127.0.0.1')
              socket.on('connect', () => {
                setInterval(() => {}, 1000)
              })
              socket.on('error', () => {
                setTimeout(tryConnect, 50)
              })
            }
            tryConnect()
          })`
        ],
        { stdio: 'ignore' }
      )

      await new Promise((r) => setTimeout(r, 100))
      expect(isProcessAlive(clientProc.pid!)).toBe(true)

      // 2. 随后启动服务端进程监听该端口（childProc.pid > clientProc.pid）
      childProc = spawn(
        process.execPath,
        [
          '-e',
          `import('node:net').then(({ createServer }) => {
            const s = createServer((socket) => {
              // 保持连接
            })
            s.listen(${testPort}, '127.0.0.1', () => {
              setInterval(() => {}, 1000)
            })
          })`
        ],
        { stdio: 'ignore' }
      )

      expect(childProc.pid!).toBeGreaterThan(clientProc.pid!)

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 100))
        const pid = await findPidByPort(testPort)
        if (pid) break
      }

      // 等待客户端成功连上服务端
      await new Promise((r) => setTimeout(r, 300))
      expect(isProcessAlive(clientProc.pid!)).toBe(true)

      // 无论 PID 大小顺序，findPidByPort 必须只返回服务端 PID
      const foundPid = await findPidByPort(testPort)
      expect(foundPid).toBe(childProc.pid)
      expect(foundPid).not.toBe(clientProc.pid)

      // 停止守护进程/释放端口时，只应强杀服务端，不能误杀客户端
      const stopped = await stopBridgeDaemon(testPort)
      expect(stopped).toBe(true)
      expect(isProcessAlive(childProc.pid!)).toBe(false)
      expect(isProcessAlive(clientProc.pid!)).toBe(true)
    } finally {
      if (clientProc) {
        try {
          clientProc.kill('SIGKILL')
        } catch {
          // ignore
        }
      }
    }
  })

  it('复现：在 onlyVerified 模式下，对于无法确认归属的非守护进程不得误杀且返回 false', async () => {
    const testPort = 19882
    childProc = spawn(
      process.execPath,
      [
        '-e',
        `import('node:http').then(({ createServer }) => {
          const s = createServer((req, res) => res.end('ok'))
          s.listen(${testPort}, '127.0.0.1', () => {
            setInterval(() => {}, 1000)
          })
        })`
      ],
      { stdio: 'ignore' }
    )

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100))
      const pid = await findPidByPort(testPort)
      if (pid) break
    }

    // 在 onlyVerified: true 模式下，由于不是受管 bridge-daemon 进程，必须拒绝误杀并返回 false
    const stopped = await stopBridgeDaemon(testPort, { onlyVerified: true })
    expect(stopped).toBe(false)
    expect(isProcessAlive(childProc.pid!)).toBe(true)

    childProc.kill('SIGKILL')
  })
})
