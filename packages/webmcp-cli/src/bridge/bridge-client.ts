/**
 * ExtensionBridgeClient (支持 Server 模式与 Client 模式自适应)
 *
 * 架构角色：
 * 1. Server 模式：作为 WebSocket 服务端（127.0.0.1:18999），接收 Chrome 扩展连入；
 *    - 维持与 Chrome 扩展的单一活跃长连接，支持新实例平滑替换；
 *    - 支持本地临时 CLI Client 连入并发起 RPC 请求，透明转发至当前连接的浏览器实例。
 * 2. Client 模式：当 18999 端口已被占（例如常驻的 MCP Server 正在运行），自动作为 Client 连入现有服务发送 RPC 请求，无需争抢端口。
 */

import { WebSocketServer, WebSocket as WsClient, type WebSocket } from 'ws'
import { EventEmitter } from 'node:events'
import { randomUUID, randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import { DEFAULT_WS_PORT, PROTOCOL_VERSION, WS_CLOSE_CODE, BRIDGE_ERROR_CODE, BRIDGE_METHODS } from './protocol.js'
import { executeBash, BashTimeoutError, BashInvalidParamsError } from './bash-executor.js'
import { pickDirectory } from './directory-picker.js'

export { PROTOCOL_VERSION, BRIDGE_ERROR_CODE }

const WS_PORT = DEFAULT_WS_PORT
const REQUEST_TIMEOUT_MS = 30_000
const HANDSHAKE_TIMEOUT_MS = 5_000
const WS_OPEN = 1

/** 存储凭据路径（权限设置为 0600，仅当前宿主系统用户有权读取） */
const TOKEN_FILE_DIR = path.join(os.homedir(), '.robot-wxt')
const TOKEN_FILE_PATH = path.join(TOKEN_FILE_DIR, 'bridge-token')

/** 从显式指定参数、环境变量或 0600 本地凭据文件读取认证 Token，若不存在则生成并持久化 */
export function resolveOrCreateAuthToken(explicitToken?: string): string {
  if (explicitToken && explicitToken.trim()) {
    const token = explicitToken.trim()
    try {
      if (!fs.existsSync(TOKEN_FILE_DIR)) {
        fs.mkdirSync(TOKEN_FILE_DIR, { mode: 0o700, recursive: true })
      }
      fs.writeFileSync(TOKEN_FILE_PATH, token, { mode: 0o600, encoding: 'utf8' })
    } catch {
      // ignore
    }
    return token
  }
  if (process.env.ROBOT_WXT_BRIDGE_TOKEN) {
    return process.env.ROBOT_WXT_BRIDGE_TOKEN.trim()
  }
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const existing = fs.readFileSync(TOKEN_FILE_PATH, 'utf8').trim()
      if (existing) return existing
    }
  } catch {
    // ignore
  }

  const newToken = randomBytes(32).toString('hex')
  try {
    if (!fs.existsSync(TOKEN_FILE_DIR)) {
      fs.mkdirSync(TOKEN_FILE_DIR, { mode: 0o700, recursive: true })
    }
    fs.writeFileSync(TOKEN_FILE_PATH, newToken, { mode: 0o600, encoding: 'utf8' })
  } catch {
    // 权限受限或受限环境安全降级
  }
  return newToken
}

/** 从版本字符串解析 major 号 */
function parseMajorVersion(v: string): number {
  return parseInt(v.split('.')[0] ?? '0', 10)
}

/**
 * 派生共享密钥：SHA-256(token + ":" + hmacSalt)
 */
export function deriveSharedSecret(tokenOrExtensionId: string, hmacSalt: string): Buffer {
  return createHash('sha256').update(`${tokenOrExtensionId}:${hmacSalt}`).digest()
}

/** 计算 HMAC-SHA256 签名，返回 hex 字符串 */
export function computeHmac(secret: Buffer, challenge: string): string {
  return createHmac('sha256', secret).update(challenge).digest('hex')
}

/** 常量时间比较两个 HMAC 签名，杜绝时序攻击 */
export function verifyHmacConstantTime(actualHex: string | undefined, expectedHex: string): boolean {
  if (!actualHex || typeof actualHex !== 'string') return false
  try {
    const actualBuf = Buffer.from(actualHex, 'hex')
    const expectedBuf = Buffer.from(expectedHex, 'hex')
    if (actualBuf.length !== expectedBuf.length) return false
    return timingSafeEqual(actualBuf, expectedBuf)
  } catch {
    return false
  }
}

/** 获取跨平台的强制释放端口命令指引 */
export function getKillPortHint(port: number): string {
  if (process.platform === 'win32') {
    return `netstat -ano | findstr :${port} （找到 PID 后执行: taskkill /pid <PID> /T /F）`
  }
  return `lsof -ti:${port} | xargs kill -9`
}

export type JsonRpcMethod =
  | 'browser/state'
  | 'tool/call'
  | 'browser/tabs'
  | 'sub_agent/run'
  | 'skills/list'
  | 'skills/get'
  | 'skills/read_resource'

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string
  method: JsonRpcMethod
  params: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

interface SocketAuthState {
  authenticated: boolean
  challenge: string
  hmacSalt: string
  clientType?: 'extension' | 'cli-client'
  timer: ReturnType<typeof setTimeout>
}

interface ForwardedRequestInfo {
  socket: WebSocket
  originalId: string | number
  progressToken?: string | number
  timer?: ReturnType<typeof setTimeout>
}

export class ExtensionBridgeClient extends EventEmitter {
  private wss: WebSocketServer | null = null
  private extensionSocket: WebSocket | null = null
  private clientSocket: WebSocket | null = null
  private forwardedRequests = new Map<string, ForwardedRequestInfo>()
  private pending = new Map<string, PendingRequest>()
  private socketAuthStates = new Map<WebSocket, SocketAuthState>()
  private destroyed = false
  private idCounter = 0
  private isClientMode = false
  private readonly explicitAuthToken?: string
  private authToken: string

  constructor(
    private readonly port: number = WS_PORT,
    authToken?: string
  ) {
    super()
    this.explicitAuthToken = authToken
    this.authToken = authToken ?? resolveOrCreateAuthToken()
  }

  /** 获取当前服务端使用的认证 Token */
  get currentAuthToken(): string {
    return this.authToken
  }

  /** 获取当前激活的 Socket */
  private _getActiveSocket(): WebSocket | null {
    if (this.isClientMode && this.clientSocket) {
      return this.clientSocket.readyState === WS_OPEN ? this.clientSocket : null
    }
    if (this.extensionSocket && this.extensionSocket.readyState === WS_OPEN) {
      return this.extensionSocket
    }
    return null
  }

  /** 是否已有就绪的扩展连接（或作为 Client 已连接到 Server） */
  get isConnected(): boolean {
    return this._getActiveSocket() != null
  }

  /** 等待扩展连接或作为客户端连入服务就绪 */
  async waitForReady(timeoutMs: number = 5000): Promise<boolean> {
    if (this.isConnected) return true
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        cleanup()
        resolve(this.isConnected)
      }, timeoutMs)
      const cleanup = () => {
        clearTimeout(timer)
        this.off('connected', onConnected)
      }
      const onConnected = () => {
        cleanup()
        resolve(true)
      }
      this.on('connected', onConnected)
    })
  }

  /**
   * 静态探测目标端口的桥接服务状态
   */
  static async probe(
    port: number = WS_PORT,
    authToken?: string,
    timeoutMs: number = 800
  ): Promise<{ running: boolean; authed: boolean; error?: string }> {
    const client = new ExtensionBridgeClient(port, authToken)
    try {
      const res = await client._probeExistingServer(timeoutMs)
      if (client.clientSocket) {
        try {
          client.clientSocket.close(1000, 'Probe finished')
        } catch {
          // ignore
        }
      }
      if (res.success) {
        return { running: true, authed: true }
      }
      if (res.error) {
        const isAuthError =
          res.error.message.includes('HMAC') ||
          res.error.message.includes('认证失败') ||
          res.error.message.includes('Unauthorized')
        if (isAuthError) {
          return { running: true, authed: false, error: res.error.message }
        }
        return { running: false, authed: false, error: res.error.message }
      }
      return { running: false, authed: false }
    } finally {
      client.destroy()
    }
  }

  /**
   * 自动探测模式：
   * 优先尝试连接已存在的 18999 服务；连接不上时退回启动本机的 WebSocketServer。
   */
  async startAuto(probeTimeoutMs: number = 800): Promise<void> {
    if (this.destroyed) return

    const probe = await this._probeExistingServer(probeTimeoutMs)
    if (probe.success) {
      // 成功作为 Client 连入已存在的服务
      return
    }

    if (probe.error) {
      // 端口上有服务但认证失败或异常，绝不能再调用 this.connect() 去抢端口
      throw probe.error
    }

    // 无已有服务（ECONNREFUSED 等），启动本地 Server
    this.connect()
  }

  private async _probeExistingServer(timeoutMs: number): Promise<{ success: boolean; error?: Error }> {
    return new Promise((resolve) => {
      let settled = false
      let connectionEstablished = false
      let authFailedReason: string | null = null
      const ws = new WsClient(`ws://127.0.0.1:${this.port}`)

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          try {
            ws.terminate()
          } catch {
            // ignore
          }
          if (authFailedReason) {
            resolve({
              success: false,
              error: new Error(
                `本地桥接服务（127.0.0.1:${this.port}）正在运行，但 HMAC 认证失败：${authFailedReason}。\n` +
                  `请确认当前 CLI 使用的 Token 与该服务一致，或终止占用进程（可执行: ${getKillPortHint(this.port)}）。`
              )
            })
          } else if (connectionEstablished) {
            resolve({
              success: false,
              error: new Error(
                `本地 127.0.0.1:${this.port} 已被占用且无响应（可能不是有效桥接服务），请先终止占用进程（可执行: ${getKillPortHint(this.port)}）。`
              )
            })
          } else {
            resolve({ success: false })
          }
        }
      }, timeoutMs)

      ws.on('open', () => {
        connectionEstablished = true
      })

      ws.on('close', (code, reason) => {
        const reasonStr = reason ? reason.toString() : ''
        if (code === WS_CLOSE_CODE.UNAUTHORIZED || reasonStr.includes('Unauthorized') || reasonStr.includes('HMAC')) {
          authFailedReason = reasonStr || 'Token 认证被拒绝 (HMAC verification failed)'
        }
        if (!settled && authFailedReason) {
          settled = true
          clearTimeout(timer)
          resolve({
            success: false,
            error: new Error(
              `本地桥接服务（127.0.0.1:${this.port}）正在运行，但 HMAC 认证失败：${authFailedReason}。\n` +
                `请确认当前 CLI 使用的 Token 与该服务一致，或终止占用进程（可执行: ${getKillPortHint(this.port)}）。`
            )
          })
        }
      })

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          // 收到挑战时自动回复 cli-client 认证（附带 HMAC 签名）
          if (msg.type === 'BRIDGE_CHALLENGE' && msg.challenge && msg.hmacSalt) {
            connectionEstablished = true
            const secret = deriveSharedSecret(this.authToken, msg.hmacSalt)
            const hmac = computeHmac(secret, msg.challenge)
            ws.send(
              JSON.stringify({
                type: 'BRIDGE_AUTH',
                clientType: 'cli-client',
                challenge: msg.challenge,
                hmac
              })
            )
            return
          }

          // 握手确认通过
          if (msg.type === 'BRIDGE_AUTH_OK' && !settled) {
            settled = true
            clearTimeout(timer)
            this.isClientMode = true
            this.clientSocket = ws
            this._bindClientSocket(ws)
            this.emit('connected')
            resolve({ success: true })
          }
        } catch {
          // ignore
        }
      })

      ws.once('error', (err: any) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          try {
            ws.terminate()
          } catch {
            // ignore
          }
          if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
            resolve({ success: false })
          } else {
            resolve({
              success: false,
              error: new Error(`连接本地 127.0.0.1:${this.port} 失败: ${err?.message || err}`)
            })
          }
        }
      })
    })
  }

  private _bindClientSocket(ws: WebSocket): void {
    ws.on('message', (data) => {
      let msg: any
      try {
        msg = JSON.parse(data.toString())
      } catch {
        return
      }

      if (msg.type === 'BRIDGE_CHALLENGE' || msg.type === 'BRIDGE_AUTH_OK') {
        return
      }

      // 处理子代理进度推送事件
      if (msg.method === 'notification/sub_agent_progress') {
        this.emit('progress', msg.params)
        return
      }

      const pending = this.pending.get(String(msg.id))
      if (!pending) return
      this.pending.delete(String(msg.id))
      clearTimeout(pending.timer)

      if (msg.error) {
        pending.reject(new Error(`[${msg.error.code}] ${msg.error.message}`))
      } else {
        pending.resolve(msg.result)
      }
    })

    ws.on('close', () => {
      this.clientSocket = null
      this.emit('disconnected')
      this._rejectAllPending('与服务的连接已断开')
    })
  }

  /** 启动 WebSocket 服务端，等待 Chrome 扩展（Offscreen Document）连入 */
  connect(): void {
    if (this.destroyed) return
    if (this.wss) return

    try {
      this.wss = new WebSocketServer({
        port: this.port,
        host: '127.0.0.1',
        verifyClient: (info, callback) => {
          const origin = info.origin || info.req.headers.origin
          if (origin) {
            // 浏览器端来源校验：仅允许浏览器扩展（chrome-extension:// 或 moz-extension://）
            const isAllowedExtension =
              origin.startsWith('chrome-extension://') ||
              origin.startsWith('moz-extension://') ||
              origin.startsWith('extension://')
            if (!isAllowedExtension) {
              callback(false, 403, 'Forbidden origin: only browser extensions are allowed')
              return
            }
          }
          // 本地无 Origin 的进程（Node.js / CLI 进程）或合法扩展允许接入，后续须完成握手
          callback(true)
        }
      })
    } catch (err) {
      this.emit('error', err)
      return
    }

    this.wss.on('listening', () => {
      this.emit('listening')
    })

    this.wss.on('error', (err: any) => {
      if (err?.code === 'EADDRINUSE') {
        process.stderr.write(
          `[webmcp-cli] ⚠️ 端口 ${this.port} 已被占用，请先终止占用该端口的旧进程（可执行: ${getKillPortHint(this.port)}）\n`
        )
      }
      this.emit('error', err)
    })

    this.wss.on('connection', (socket) => {
      // 1. 初始化握手状态
      const challenge = randomUUID()
      const hmacSalt = randomBytes(16).toString('hex')
      const authState: SocketAuthState = {
        authenticated: false,
        challenge,
        hmacSalt,
        timer: setTimeout(() => {
          if (!authState.authenticated) {
            try {
              socket.close(WS_CLOSE_CODE.UNAUTHORIZED, 'Handshake timeout')
            } catch {
              // ignore
            }
          }
        }, HANDSHAKE_TIMEOUT_MS)
      }
      this.socketAuthStates.set(socket, authState)

      // 2. 下发挑战（附带 hmacSalt 和协议版本）
      try {
        socket.send(
          JSON.stringify({
            type: 'BRIDGE_CHALLENGE',
            challenge,
            hmacSalt,
            protocolVersion: PROTOCOL_VERSION
          })
        )
      } catch {
        // ignore
      }

      socket.on('message', async (data) => {
        await this.handleSocketMessage(socket, data)
      })

      socket.on('close', () => {
        const auth = this.socketAuthStates.get(socket)
        if (auth?.timer) clearTimeout(auth.timer)
        this.socketAuthStates.delete(socket)

        // 清理所有由该 socket 发起的待处理转发请求映射
        for (const [reqId, fwdInfo] of this.forwardedRequests.entries()) {
          if (fwdInfo.socket === socket) {
            if (fwdInfo.timer) clearTimeout(fwdInfo.timer)
            this.forwardedRequests.delete(reqId)
          }
        }

        if (socket === this.extensionSocket) {
          this.extensionSocket = null
          this.emit('disconnected')
          for (const [reqId, fwdInfo] of this.forwardedRequests.entries()) {
            if (fwdInfo.timer) clearTimeout(fwdInfo.timer)
            try {
              if (fwdInfo.socket.readyState === WS_OPEN) {
                fwdInfo.socket.send(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: fwdInfo.originalId,
                    error: {
                      code: BRIDGE_ERROR_CODE.EXTENSION_NOT_CONNECTED,
                      message: 'Chrome 扩展连接已断开'
                    }
                  })
                )
              }
            } catch {}
            this.forwardedRequests.delete(reqId)
          }
          this._rejectAllPending('WebSocket 连接已断开')
        }
      })

      socket.on('error', () => {
        // close 会随后触发
      })
    })

    this.wss.on('error', (err) => {
      this.emit('error', err)
    })
  }

  private async handleSocketMessage(socket: WebSocket, data: any): Promise<void> {
    let msg: any
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }

    const currentAuth = this.socketAuthStates.get(socket)
    if (!currentAuth || !currentAuth.authenticated) {
      await this.handleHandshake(socket, currentAuth, msg)
      return
    }

    if (msg.type === 'KEEP_ALIVE' || msg.type === 'WS_BRIDGE_KEEP_ALIVE') {
      return
    }

    if (msg.method && msg.id) {
      if (socket === this.extensionSocket) {
        await this.handleExtensionSystemRpc(socket, msg)
        return
      }
      await this.handleForwardRpc(socket, msg)
      return
    }

    if (msg.method && !msg.id) {
      this.handleProgressNotification(msg)
      return
    }

    if (msg.id) {
      this.handleIncomingResponse(msg)
    }
  }

  private verifyHandshakeHmac(currentAuth: SocketAuthState, hmac?: string): boolean {
    if (!currentAuth.hmacSalt || !hmac) return false

    const secret = deriveSharedSecret(this.authToken, currentAuth.hmacSalt)
    const expectedHmac = computeHmac(secret, currentAuth.challenge)
    if (verifyHmacConstantTime(hmac, expectedHmac)) {
      return true
    }

    if (!this.explicitAuthToken) {
      const diskToken = resolveOrCreateAuthToken()
      if (diskToken && diskToken !== this.authToken) {
        const diskSecret = deriveSharedSecret(diskToken, currentAuth.hmacSalt)
        const diskExpectedHmac = computeHmac(diskSecret, currentAuth.challenge)
        if (verifyHmacConstantTime(hmac, diskExpectedHmac)) {
          this.authToken = diskToken
          return true
        }
      }
    }

    return false
  }

  private async handleHandshake(socket: WebSocket, currentAuth: SocketAuthState | undefined, msg: any): Promise<void> {
    if (!currentAuth || msg.type !== 'BRIDGE_AUTH' || msg.challenge !== currentAuth.challenge) {
      try {
        socket.close(WS_CLOSE_CODE.UNAUTHORIZED, 'Unauthorized: Handshake failed')
      } catch {}
      return
    }

    const clientVersion = typeof msg.protocolVersion === 'string' ? msg.protocolVersion : PROTOCOL_VERSION
    if (parseMajorVersion(clientVersion) !== parseMajorVersion(PROTOCOL_VERSION)) {
      try {
        socket.close(
          WS_CLOSE_CODE.PROTOCOL_MISMATCH,
          `Protocol version mismatch: server=${PROTOCOL_VERSION}, client=${clientVersion}`
        )
      } catch {}
      return
    }

    const verified = this.verifyHandshakeHmac(currentAuth, msg.hmac)

    if (!verified) {
      const tokenFingerprint = this.authToken ? `${this.authToken.slice(0, 6)}...` : 'none'
      process.stderr.write(
        `[webmcp-cli] HMAC 验证失败，拒绝连接. client extensionId=${msg.extensionId}, server authTokenFingerprint=${tokenFingerprint}\n`
      )
      try {
        socket.close(WS_CLOSE_CODE.UNAUTHORIZED, 'Unauthorized: HMAC verification failed')
      } catch {}
      return
    }

    clearTimeout(currentAuth.timer)
    currentAuth.authenticated = true
    currentAuth.clientType = msg.clientType

    if (msg.clientType === 'extension') {
      if (this.extensionSocket && this.extensionSocket !== socket) {
        try {
          this.extensionSocket.close(WS_CLOSE_CODE.REPLACED, 'Replaced by new connection')
        } catch {}
      }
      this.extensionSocket = socket
      this.emit('connected')
    }

    try {
      socket.send(
        JSON.stringify({
          type: 'BRIDGE_AUTH_OK',
          clientType: msg.clientType
        })
      )
    } catch {}
  }

  private async handleForwardRpc(socket: WebSocket, msg: any): Promise<void> {
    let targetSocket = this._getActiveSocket()
    if (!targetSocket) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 6000)
        this.once('connected', () => {
          clearTimeout(timer)
          resolve()
        })
      })
      targetSocket = this._getActiveSocket()
    }

    if (!targetSocket) {
      socket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          error: {
            code: BRIDGE_ERROR_CODE.EXTENSION_NOT_CONNECTED,
            message:
              'Chrome 扩展尚未连接到本地桥接服务。请确保浏览器已启动，且在侧边栏中开启了「本地 WebSocket 桥接」开关。'
          }
        })
      )
      return
    }

    const internalId = `fwd_${++this.idCounter}_${Date.now()}`
    const timeoutMs = msg.method === 'sub_agent/run' ? 180_000 : REQUEST_TIMEOUT_MS

    const timer = setTimeout(() => {
      const fwd = this.forwardedRequests.get(internalId)
      if (!fwd) return
      this.forwardedRequests.delete(internalId)
      try {
        if (fwd.socket.readyState === WS_OPEN) {
          fwd.socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: fwd.originalId,
              error: {
                code: BRIDGE_ERROR_CODE.REQUEST_TIMEOUT,
                message: `请求转发至 Chrome 扩展超时 (${timeoutMs / 1000}s)`
              }
            })
          )
        }
      } catch {}
    }, timeoutMs)

    this.forwardedRequests.set(internalId, {
      socket,
      originalId: msg.id,
      progressToken: msg.params?.progressToken as string | number | undefined,
      timer
    })
    const outgoingMsg = { ...msg, id: internalId }
    targetSocket.send(JSON.stringify(outgoingMsg))
  }

  private sendJsonRpcResponse(
    socket: WebSocket,
    response: { id: any; result?: any; error?: { code: number; message: string } }
  ): void {
    if (socket.readyState === WS_OPEN) {
      socket.send(JSON.stringify({ jsonrpc: '2.0', ...response }))
    }
  }

  private formatSystemRpcError(err: any): { code: number; message: string } {
    if (err instanceof BashInvalidParamsError || err?.code === 'INVALID_PARAMS' || err?.message === '命令不能为空') {
      return { code: BRIDGE_ERROR_CODE.INVALID_PARAMS, message: err?.message || '参数错误' }
    }
    if (
      err instanceof BashTimeoutError ||
      err?.code === 'TIMEOUT' ||
      (typeof err?.message === 'string' && err.message.includes('超时'))
    ) {
      return { code: BRIDGE_ERROR_CODE.EXECUTION_TIMEOUT, message: err?.message || '命令执行超时' }
    }
    return { code: BRIDGE_ERROR_CODE.EXECUTION_FAILED, message: err?.message || '执行失败' }
  }

  private readonly systemRpcHandlers: Record<string, (params: any) => Promise<any>> = Object.assign(
    Object.create(null),
    {
      [BRIDGE_METHODS.SYSTEM_BASH]: async (params: any) => {
        return executeBash(params || {})
      },
      [BRIDGE_METHODS.SYSTEM_PICK_DIRECTORY]: async (params: any) => {
        const selectedPath = await pickDirectory({
          title: (params?.title as string) || undefined,
          defaultPath: (params?.defaultPath as string) || undefined
        })
        return {
          path: selectedPath,
          selectedPath,
          canceled: selectedPath === null
        }
      }
    }
  )

  private async handleExtensionSystemRpc(socket: WebSocket, msg: any): Promise<void> {
    const { id, method, params } = msg
    const handler =
      typeof method === 'string' && Object.prototype.hasOwnProperty.call(this.systemRpcHandlers, method)
        ? this.systemRpcHandlers[method]
        : undefined

    if (!handler || typeof handler !== 'function') {
      this.sendJsonRpcResponse(socket, {
        id,
        error: {
          code: BRIDGE_ERROR_CODE.METHOD_NOT_FOUND,
          message: `不支持的方法: ${method}`
        }
      })
      return
    }

    try {
      const result = await handler(params)
      this.sendJsonRpcResponse(socket, { id, result })
    } catch (err: any) {
      this.sendJsonRpcResponse(socket, { id, error: this.formatSystemRpcError(err) })
    }
  }

  private handleProgressNotification(msg: any): void {
    const token = msg.params?.progressToken
    if (token != null) {
      for (const [, reqInfo] of this.forwardedRequests) {
        if (reqInfo.progressToken === token) {
          try {
            if (reqInfo.socket.readyState === WS_OPEN) {
              reqInfo.socket.send(JSON.stringify(msg))
            }
          } catch {}
        }
      }
    }
    this.emit('progress', msg.params)
  }

  private handleIncomingResponse(msg: any): void {
    const fwdInfo = this.forwardedRequests.get(String(msg.id))
    if (fwdInfo) {
      if (fwdInfo.timer) clearTimeout(fwdInfo.timer)
      this.forwardedRequests.delete(String(msg.id))
      try {
        if (fwdInfo.socket.readyState === WS_OPEN) {
          fwdInfo.socket.send(
            JSON.stringify({
              ...msg,
              id: fwdInfo.originalId
            })
          )
        }
      } catch {}
      return
    }

    const pending = this.pending.get(String(msg.id))
    if (!pending) return
    this.pending.delete(String(msg.id))
    clearTimeout(pending.timer)

    if (msg.error) {
      pending.reject(new Error(`[${msg.error.code}] ${msg.error.message}`))
    } else {
      pending.resolve(msg.result)
    }
  }

  /** 发送 JSON-RPC 2.0 请求，返回 result */
  async call(
    method: JsonRpcMethod,
    params: Record<string, unknown> = {},
    timeoutMs?: number,
    progressToken?: string | number,
    autoWaitMs: number = 0
  ): Promise<unknown> {
    if (autoWaitMs > 0 && !this.isConnected) {
      await this.waitForReady(autoWaitMs)
    }

    const targetSocket = this._getActiveSocket()

    if (!targetSocket) {
      throw new Error(
        '与 Chrome 扩展的连接尚未就绪，请确保：\n' +
          '  1. Chrome 浏览器已启动\n' +
          '  2. Tiny Robot 扩展已安装并开启\n' +
          '  3. 扩展侧边栏已打开'
      )
    }

    const effectiveTimeoutMs = timeoutMs ?? (method === 'sub_agent/run' ? 180_000 : REQUEST_TIMEOUT_MS)
    const id = String(++this.idCounter)
    const requestParams: Record<string, unknown> = { ...params }
    if (progressToken != null) {
      requestParams.progressToken = progressToken
    }
    const request: JsonRpcRequest = { jsonrpc: '2.0', id, method, params: requestParams }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`请求超时（${effectiveTimeoutMs / 1000}s）：${method}`))
      }, effectiveTimeoutMs)

      this.pending.set(id, { resolve, reject, timer })
      try {
        targetSocket.send(JSON.stringify(request))
      } catch (err) {
        this.pending.delete(id)
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  /** 销毁服务，断开所有连接 */
  destroy(): void {
    this.destroyed = true
    this._rejectAllPending('ExtensionBridgeClient 已销毁')
    this.forwardedRequests.clear()

    if (this.clientSocket) {
      try {
        this.clientSocket.close()
      } catch {
        // ignore
      }
      this.clientSocket = null
    }

    if (this.extensionSocket) {
      try {
        this.extensionSocket.close()
      } catch {
        // ignore
      }
      this.extensionSocket = null
    }

    if (this.wss) {
      try {
        this.wss.close()
      } catch {
        // ignore
      }
      this.wss = null
    }
  }

  private _rejectAllPending(reason: string): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
    }
    this.pending.clear()
    for (const [, fwdInfo] of this.forwardedRequests) {
      if (fwdInfo.timer) clearTimeout(fwdInfo.timer)
    }
    this.forwardedRequests.clear()
  }
}
