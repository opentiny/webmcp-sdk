import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { createHash, createHmac } from 'node:crypto'
import { ExtensionBridgeClient } from '../src/bridge/bridge-client.js'

class MockSocket extends EventEmitter {
  readyState = 1
  sentMessages: string[] = []
  closeCode?: number
  bufferedAmount = 0

  send(data: string, cb?: (err?: Error) => void) {
    this.sentMessages.push(data)
    cb?.()
  }

  close(code?: number) {
    this.readyState = 3
    this.closeCode = code ?? 1000
    this.emit('close', { code: this.closeCode })
  }

  reply(message: object) {
    this.emit('message', JSON.stringify(message))
  }

  lastJson(): any {
    return JSON.parse(this.sentMessages[this.sentMessages.length - 1])
  }
}

let mockWss: EventEmitter & { close: () => void }

vi.mock('ws', () => ({
  WebSocketServer: vi.fn().mockImplementation(function () {
    mockWss = Object.assign(new EventEmitter(), { close: vi.fn() })
    return mockWss
  })
}))

const TOKEN = 'bridge-token-for-test'

function hmacHex(secretInput: string, message: string): string {
  return createHmac('sha256', createHash('sha256').update(secretInput).digest()).update(message).digest('hex')
}

type AuthRule = 'v1.3' | 'v1.2' | 'v1.2-key-on-v1.3-message'

function connect(options: {
  rule: AuthRule
  protocolVersion?: string
  clientType?: 'extension' | 'cli-client'
  instanceId?: string
}): MockSocket {
  const socket = new MockSocket()
  mockWss.emit('connection', socket)
  const challengeMsg = JSON.parse(socket.sentMessages[0])
  const { challenge, hmacSalt } = challengeMsg
  const instanceId = options.instanceId ?? 'instance-a'
  const hmac =
    options.rule === 'v1.3'
      ? hmacHex(`${TOKEN}:${hmacSalt}:bridge-auth-v1.3`, `${challenge}:${instanceId}`)
      : options.rule === 'v1.2'
        ? hmacHex(`${TOKEN}:${hmacSalt}`, challenge)
        : hmacHex(`${TOKEN}:${hmacSalt}`, `${challenge}:${instanceId}`)
  socket.reply({
    type: 'BRIDGE_AUTH',
    clientType: options.clientType ?? 'extension',
    challenge,
    hmac,
    extensionId: 'ext-id',
    instanceId,
    ...(options.protocolVersion ? { protocolVersion: options.protocolVersion } : {})
  })
  return socket
}

async function callRpc(socket: MockSocket, method: string, params: object = {}) {
  socket.sentMessages = []
  socket.reply({ jsonrpc: '2.0', id: 'req-1', method, params })
  await vi.waitFor(() => expect(socket.sentMessages.length).toBeGreaterThan(0))
  return socket.lastJson()
}

describe('桥接协议 1.3.0 握手', () => {
  let client: ExtensionBridgeClient
  const handle = vi.fn()

  beforeEach(() => {
    handle.mockReset()
    handle.mockResolvedValue({ phase: 'prepared' })
    client = new ExtensionBridgeClient(18999, TOKEN, { extensionUpdates: { handle } })
    client.connect()
  })

  afterEach(() => {
    client.destroy()
  })

  it('挑战声明协议版本 1.3.0', () => {
    const socket = new MockSocket()
    mockWss.emit('connection', socket)
    expect(JSON.parse(socket.sentMessages[0]).protocolVersion).toBe('1.3.0')
  })

  it('按 1.3 规则认证的扩展可以调用 extension/*，处理器收到握手里的 instanceId', async () => {
    const socket = connect({ rule: 'v1.3', protocolVersion: '1.3.0', instanceId: 'instance-x' })
    expect(socket.lastJson().type).toBe('BRIDGE_AUTH_OK')

    const response = await callRpc(socket, 'extension/txn_status', { txnId: 't1' })

    expect(response).toEqual({ jsonrpc: '2.0', id: 'req-1', result: { phase: 'prepared' } })
    expect(handle).toHaveBeenCalledWith('extension/txn_status', { txnId: 't1' }, 'instance-x')
  })

  it('声明 1.2.0 并按 1.2 规则签名的扩展认证通过，但 extension/* 返回 -32601', async () => {
    const socket = connect({ rule: 'v1.2', protocolVersion: '1.2.0' })
    expect(socket.lastJson().type).toBe('BRIDGE_AUTH_OK')

    const response = await callRpc(socket, 'extension/txn_status', { txnId: 't1' })

    expect(response.error.code).toBe(-32601)
    expect(handle).not.toHaveBeenCalled()
  })

  it('未声明协议版本的客户端按 1.2 规则认证', () => {
    const socket = connect({ rule: 'v1.2', clientType: 'cli-client' })
    expect(socket.lastJson().type).toBe('BRIDGE_AUTH_OK')
  })

  it('声明 1.3.0 但用 1.2 密钥签新格式消息时拒绝连接', () => {
    const socket = connect({ rule: 'v1.2-key-on-v1.3-message', protocolVersion: '1.3.0' })
    expect(socket.closeCode).toBe(4001)
  })

  it('声明 1.3.0 但按 1.2 规则签名时拒绝连接', () => {
    const socket = connect({ rule: 'v1.2', protocolVersion: '1.3.0' })
    expect(socket.closeCode).toBe(4001)
  })

  it('声明 1.3.0 但没有 instanceId 时拒绝连接', () => {
    const socket = connect({ rule: 'v1.3', protocolVersion: '1.3.0', instanceId: '' })
    expect(socket.closeCode).toBe(4001)
  })

  it('按 1.3 规则认证的 cli-client 调用 extension/* 返回 -32601，且不转发给扩展', async () => {
    const extension = connect({ rule: 'v1.3', protocolVersion: '1.3.0' })
    const cli = connect({ rule: 'v1.3', protocolVersion: '1.3.0', clientType: 'cli-client' })
    extension.sentMessages = []

    const response = await callRpc(cli, 'extension/txn_status', { txnId: 't1' })

    expect(response.error.code).toBe(-32601)
    expect(extension.sentMessages).toEqual([])
    expect(handle).not.toHaveBeenCalled()
  })

  it('处理器抛出的业务错误以 -32010 返回，原因写在 error.data.reason', async () => {
    const { ExtensionUpdateError } = await import('../src/extension-update/errors.js')
    handle.mockRejectedValue(new ExtensionUpdateError('busy', '安装目录正被另一项操作使用'))
    const socket = connect({ rule: 'v1.3', protocolVersion: '1.3.0' })

    const response = await callRpc(socket, 'extension/commit', { txnId: 't1' })

    expect(response.error).toEqual({ code: -32010, message: '安装目录正被另一项操作使用', data: { reason: 'busy' } })
  })
})
