/**
 * ExtensionBridgeClient 单元测试
 *
 * 验证 WebSocketServer 模式下的：
 * - 连接建立与消息发送
 * - 请求/响应 id 对齐
 * - 服务端错误处理
 * - 超时后 reject
 * - 连接断开时 reject 所有 pending 请求
 * - 未连接时立即 reject
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { createHash } from 'node:crypto'
import { ExtensionBridgeClient, deriveSharedSecret, computeHmac } from '../src/bridge/bridge-client.js'

vi.mock('../src/bridge/directory-picker.js', () => ({
  pickDirectory: vi.fn(async () => '/mock/selected/dir')
}))

// ── Mock WebSocket & WebSocketServer ─────────────────────────────────────────

class MockSocket extends EventEmitter {
  readyState = 1 // OPEN
  sentMessages: string[] = []
  closeCode?: number

  send(data: string) {
    this.sentMessages.push(data)
  }

  close(code?: number) {
    this.readyState = 3 // CLOSED
    this.closeCode = code ?? 1000
    this.emit('close', { code: this.closeCode })
  }

  reply(response: object) {
    this.emit('message', JSON.stringify(response))
  }
}

class MockWebSocketServer extends EventEmitter {
  close = vi.fn()
  options?: any
}

let mockWss: MockWebSocketServer
let mockWssOptions: any
let mockSocket: MockSocket

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(function (this: any, opts: any) {
    mockWss = new MockWebSocketServer()
    mockWss.options = opts
    mockWssOptions = opts
    return mockWss
  })
}))

/** 辅助函数：模拟扩展侧完成 HMAC 挑战握手 */
function answerHandshake(
  socket: MockSocket,
  targetClient: ExtensionBridgeClient,
  options: {
    clientType?: 'extension' | 'cli-client'
    extensionId?: string
    instanceId?: string
    tamperHmac?: boolean
    authToken?: string
  } = {}
) {
  const challengeMsg = JSON.parse(socket.sentMessages[0])
  expect(challengeMsg.type).toBe('BRIDGE_CHALLENGE')
  expect(challengeMsg.hmacSalt).toBeTruthy()

  const clientType = options.clientType ?? 'extension'
  const extensionId = options.extensionId ?? 'tiny-robot-wxt'
  const secretKey = options.authToken ?? targetClient.currentAuthToken
  const secret = deriveSharedSecret(secretKey, challengeMsg.hmacSalt)
  const hmac = options.tamperHmac ? 'invalid-hmac-signature' : computeHmac(secret, challengeMsg.challenge)

  socket.reply({
    type: 'BRIDGE_AUTH',
    clientType,
    challenge: challengeMsg.challenge,
    extensionId,
    instanceId: options.instanceId ?? 'instance-a',
    hmac
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ExtensionBridgeClient (WebSocketServer 模式)', () => {
  let client: ExtensionBridgeClient

  beforeEach(() => {
    vi.useFakeTimers()
    client = new ExtensionBridgeClient()
    client.connect()

    // 模拟扩展侧连入并完成 HMAC Challenge-Response 握手
    mockSocket = new MockSocket()
    mockWss.emit('connection', mockSocket)

    answerHandshake(mockSocket, client, { instanceId: 'instance-a' })

    // 清空初始化发送的消息列表（如 BRIDGE_CHALLENGE 与 BRIDGE_AUTH_OK）
    mockSocket.sentMessages = []
  })

  afterEach(() => {
    client.destroy()
    vi.useRealTimers()
  })

  it('发送 JSON-RPC 请求并正确匹配响应', async () => {
    const callPromise = client.call('browser/state', {})

    expect(mockSocket.sentMessages.length).toBe(1)
    const sent = JSON.parse(mockSocket.sentMessages[0])
    expect(sent.method).toBe('browser/state')
    expect(sent.jsonrpc).toBe('2.0')

    // 模拟扩展回传结果
    mockSocket.reply({ jsonrpc: '2.0', id: sent.id, result: { url: 'https://example.com' } })

    const result = await callPromise
    expect((result as Record<string, string>).url).toBe('https://example.com')
  })

  it('服务端返回 error 时 reject', async () => {
    const callPromise = client.call('browser/state', {})
    const sent = JSON.parse(mockSocket.sentMessages[0])

    mockSocket.reply({
      jsonrpc: '2.0',
      id: sent.id,
      error: { code: -32050, message: 'Sidepanel 未就绪' }
    })

    await expect(callPromise).rejects.toThrow('Sidepanel 未就绪')
  })

  it('请求超时后 reject', async () => {
    const callPromise = client.call('browser/state', {})

    // 快进 31s 超时
    vi.advanceTimersByTime(31_000)

    await expect(callPromise).rejects.toThrow('请求超时')
  })

  it('连接断开时 reject 所有 pending 请求', async () => {
    const callPromise = client.call('browser/state', {})

    mockSocket.close(1006)

    await expect(callPromise).rejects.toThrow('WebSocket 连接已断开')
  })

  it('未连接时 call 立即 reject', async () => {
    const freshClient = new ExtensionBridgeClient()
    freshClient.connect() // 启动了 Server 但没有 client 连入

    await expect(freshClient.call('browser/state', {})).rejects.toThrow('与 Chrome 扩展的连接尚未就绪')
    freshClient.destroy()
  })

  it('未完成握手认证前不接受普通 JSON-RPC 业务请求', async () => {
    const freshClient = new ExtensionBridgeClient()
    freshClient.connect()

    const unauthSocket = new MockSocket()
    mockWss.emit('connection', unauthSocket)

    // 未回复 BRIDGE_AUTH，此时 client 仍处于未连接状态
    expect(freshClient.isConnected).toBe(false)
    await expect(freshClient.call('browser/state', {})).rejects.toThrow('与 Chrome 扩展的连接尚未就绪')

    freshClient.destroy()
  })

  it('单扩展连接：新连接连入时自动平滑替换旧连接', async () => {
    // 此时 mockSocket 已连接
    expect(client.isConnected).toBe(true)

    // 模拟扩展重连或刷新侧边栏（新 socket 连入）
    const newSocket = new MockSocket()
    mockWss.emit('connection', newSocket)

    answerHandshake(newSocket, client, {
      extensionId: 'tiny-robot-wxt'
    })

    newSocket.sentMessages = []

    // 请求自动发送给最新的 newSocket
    const callPromise = client.call('browser/state', {})
    expect(newSocket.sentMessages.length).toBe(1)

    const sent = JSON.parse(newSocket.sentMessages[0])
    newSocket.reply({ jsonrpc: '2.0', id: sent.id, result: { activeTabUrl: 'https://reconnected.com' } })
    const res = await callPromise
    expect((res as any).activeTabUrl).toBe('https://reconnected.com')
    // 验证旧连接通过非 1000 错误码（4000）被替换，使得旧扩展端能够触发 scheduleReconnect 支持重连
    expect(mockSocket.closeCode).toBe(4000)
  })

  it('扩展连接断开后正确更新 isConnected 状态', async () => {
    expect(client.isConnected).toBe(true)
    mockSocket.close(1000)
    expect(client.isConnected).toBe(false)
  })

  it('HMAC 签名不匹配时拒绝握手并关闭连接', async () => {
    const invalidSocket = new MockSocket()
    mockWss.emit('connection', invalidSocket)

    // 模拟恶意或篡改的 HMAC 签名
    answerHandshake(invalidSocket, client, {
      instanceId: 'fake-instance',
      tamperHmac: true
    })

    // 校验 socket 已被关闭
    expect(invalidSocket.readyState).toBe(3)
  })

  it('攻击者自报 extensionId 但未知预共享 authToken 时被拒绝连接 (AC1 安全性)', async () => {
    const attackerSocket = new MockSocket()
    mockWss.emit('connection', attackerSocket)

    // 攻击者尝试用错误的 token（或不知道真实的 authToken）进行签名
    answerHandshake(attackerSocket, client, {
      instanceId: 'attacker-instance',
      authToken: 'wrong-secret-or-unknown-token'
    })

    expect(attackerSocket.readyState).toBe(3)
  })

  it('攻击者自报 extensionId 并尝试仅凭该 extensionId 派生 HMAC 时必须被强行拒绝连接 (AC1 时序安全与密钥独立性)', async () => {
    const attackerSocket = new MockSocket()
    mockWss.emit('connection', attackerSocket)

    // 模拟攻击者利用自报的公开 extensionId 派生签名
    answerHandshake(attackerSocket, client, {
      instanceId: 'attacker-with-extension-id',
      clientType: 'extension',
      extensionId: 'tiny-robot-wxt',
      authToken: 'tiny-robot-wxt' // 仅使用 extensionId 计算，未持有服务端的真实预共享 authToken
    })

    expect(attackerSocket.readyState).toBe(3)
  })

  it('攻击者按照公开固定公式 sha256 派生签名也必须被强行拒绝连接 (AC1 禁止绕过预共享凭据)', async () => {
    const attackerSocket = new MockSocket()
    mockWss.emit('connection', attackerSocket)

    const derivedToken = createHash('sha256').update('tiny-robot-ws-bridge-fixed-token:tiny-robot-wxt').digest('hex')

    // 模拟攻击者利用公开派生公式尝试绕过鉴权
    answerHandshake(attackerSocket, client, {
      instanceId: 'attacker-with-derived-token',
      clientType: 'extension',
      extensionId: 'tiny-robot-wxt',
      authToken: derivedToken
    })

    expect(attackerSocket.readyState).toBe(3)
    expect(attackerSocket.closeCode).toBe(4001)
  })

  it('verifyClient 拦截非白名单 Origin 的恶意网页连接 (AC2)', () => {
    const verifyClient = mockWssOptions?.verifyClient
    expect(typeof verifyClient).toBe('function')

    let allowed: boolean | undefined
    let statusCode: number | undefined
    verifyClient({ origin: 'http://malicious-site.com', req: { headers: {} } }, (ok: boolean, code?: number) => {
      allowed = ok
      statusCode = code
    })
    expect(allowed).toBe(false)
    expect(statusCode).toBe(403)

    let allowedExt: boolean | undefined
    verifyClient({ origin: 'chrome-extension://abcdefghijklmnopqrstuvwxyz', req: { headers: {} } }, (ok: boolean) => {
      allowedExt = ok
    })
    expect(allowedExt).toBe(true)

    let allowedNoOrigin: boolean | undefined
    verifyClient({ origin: undefined, req: { headers: {} } }, (ok: boolean) => {
      allowedNoOrigin = ok
    })
    expect(allowedNoOrigin).toBe(true)
  })

  it('多客户端并发请求使用相同 id 时相互隔离，精准还原原始 id 并投递对应响应', async () => {
    const cli1 = new MockSocket()
    const cli2 = new MockSocket()
    mockWss.emit('connection', cli1)
    mockWss.emit('connection', cli2)

    answerHandshake(cli1, client, { clientType: 'cli-client' })
    answerHandshake(cli2, client, { clientType: 'cli-client' })

    cli1.sentMessages = []
    cli2.sentMessages = []
    mockSocket.sentMessages = []

    // 客户端 1 和 客户端 2 发送相同 id 的请求
    cli1.reply({ jsonrpc: '2.0', id: 100, method: 'browser/state', params: {} })
    cli2.reply({ jsonrpc: '2.0', id: 100, method: 'browser/state', params: {} })

    expect(mockSocket.sentMessages.length).toBe(2)
    const out1 = JSON.parse(mockSocket.sentMessages[0])
    const out2 = JSON.parse(mockSocket.sentMessages[1])
    expect(out1.id).not.toBe(out2.id) // 内部 id 唯一，不产生冲突

    // 扩展回传响应 2
    mockSocket.reply({ jsonrpc: '2.0', id: out2.id, result: { clientId: 2 } })
    expect(cli2.sentMessages.length).toBe(1)
    const resp2 = JSON.parse(cli2.sentMessages[0])
    expect(resp2.id).toBe(100) // 还原为客户端原始请求 ID
    expect(resp2.result).toEqual({ clientId: 2 })
    expect(cli1.sentMessages.length).toBe(0) // 未串线

    // 扩展回传响应 1
    mockSocket.reply({ jsonrpc: '2.0', id: out1.id, result: { clientId: 1 } })
    expect(cli1.sentMessages.length).toBe(1)
    const resp1 = JSON.parse(cli1.sentMessages[0])
    expect(resp1.id).toBe(100)
    expect(resp1.result).toEqual({ clientId: 1 })
  })

  it('CLI 客户端断开连接时，自动清理关联的 forwardedRequests 路由映射', async () => {
    // 模拟一个外部 CLI Client 连入
    const cliSocket = new MockSocket()
    mockWss.emit('connection', cliSocket)

    answerHandshake(cliSocket, client, {
      clientType: 'cli-client',
      instanceId: 'cli-client-test'
    })

    cliSocket.sentMessages = []

    // 模拟 CLI 发送请求
    cliSocket.reply({
      jsonrpc: '2.0',
      id: 'req-from-cli-1',
      method: 'browser/state',
      params: {}
    })

    // 此时 client 应该记录了 forwardedRequests
    expect((client as any).forwardedRequests.size).toBe(1)

    // 模拟 CLI 客户端断开
    cliSocket.close(1000)

    // 验证路由表中关联条目已被清理
    expect((client as any).forwardedRequests.size).toBe(0)
  })

  it('已认证扩展端发送 system/bash 请求时，CLI 执行命令并直接通过 socket 返回结果', async () => {
    mockSocket.sentMessages = []

    // 扩展端上行发送 system/bash 请求
    mockSocket.reply({
      jsonrpc: '2.0',
      id: 'ext-req-bash-1',
      method: 'system/bash',
      params: { command: 'echo "hello from ext"' }
    })

    // 等待异步 bash 执行完成
    await vi.waitFor(() => {
      expect(mockSocket.sentMessages.length).toBeGreaterThan(0)
    })

    const resp = JSON.parse(mockSocket.sentMessages[0])
    expect(resp.jsonrpc).toBe('2.0')
    expect(resp.id).toBe('ext-req-bash-1')
    expect(resp.result).toBeDefined()
    expect(resp.result.stdout).toBe('hello from ext')
    expect(resp.result.exitCode).toBe(0)
  })

  it('已认证扩展端发送未知 system 方法时，返回不支持的方法错误', async () => {
    mockSocket.sentMessages = []

    mockSocket.reply({
      jsonrpc: '2.0',
      id: 'ext-req-unknown',
      method: 'system/unknown_method',
      params: {}
    })

    await vi.waitFor(() => {
      expect(mockSocket.sentMessages.length).toBeGreaterThan(0)
    })

    const resp = JSON.parse(mockSocket.sentMessages[0])
    expect(resp.id).toBe('ext-req-unknown')
    expect(resp.error).toBeDefined()
    expect(resp.error.code).toBe(-32601)
  })

  it('已认证扩展端发送原型链属性方法名（toString/constructor/__proto__）时，必须返回 -32601 错误', async () => {
    for (const protoProp of ['toString', 'constructor', '__proto__', 'valueOf']) {
      mockSocket.sentMessages = []

      mockSocket.reply({
        jsonrpc: '2.0',
        id: `ext-req-proto-${protoProp}`,
        method: protoProp,
        params: {}
      })

      await vi.waitFor(() => {
        expect(mockSocket.sentMessages.length).toBeGreaterThan(0)
      })

      const resp = JSON.parse(mockSocket.sentMessages[0])
      expect(resp.id).toBe(`ext-req-proto-${protoProp}`)
      expect(resp.error).toBeDefined()
      expect(resp.error.code).toBe(-32601)
      expect(resp.error.message).toContain(`不支持的方法: ${protoProp}`)
    }
  })

  it('已认证扩展端发送 system/pick_directory 时正确调用并返回结果', async () => {
    mockSocket.sentMessages = []

    mockSocket.reply({
      jsonrpc: '2.0',
      id: 'ext-req-pick-1',
      method: 'system/pick_directory',
      params: { title: '测试选择工作空间' }
    })

    await vi.waitFor(() => {
      expect(mockSocket.sentMessages.length).toBeGreaterThan(0)
    })

    const resp = JSON.parse(mockSocket.sentMessages[0])
    expect(resp.id).toBe('ext-req-pick-1')
    expect(resp.result).toBeDefined()
    expect('selectedPath' in resp.result).toBe(true)
  })

  it('扩展端发送带有 conversationId 的 system/bash 请求时能在专属工作区成功执行', async () => {
    mockSocket.sentMessages = []

    mockSocket.reply({
      jsonrpc: '2.0',
      id: 'ext-req-conv-bash',
      method: 'system/bash',
      params: {
        command: 'pwd',
        conversationId: 'test_conv_sandbox_1'
      }
    })

    await vi.waitFor(() => {
      expect(mockSocket.sentMessages.length).toBeGreaterThan(0)
    })

    const resp = JSON.parse(mockSocket.sentMessages[0])
    expect(resp.id).toBe('ext-req-conv-bash')
    expect(resp.result.exitCode).toBe(0)
    expect(resp.result.stdout).toContain('test_conv_sandbox_1')
  })
})
