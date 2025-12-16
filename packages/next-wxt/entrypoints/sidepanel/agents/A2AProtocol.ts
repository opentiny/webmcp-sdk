/**
 * A2A (Agent-to-Agent) 协议实现
 * 实现标准化的 Agent 间通信协议
 */

import type { AgentMessage, Task, AgentType } from './types'
import { TaskStatus } from './types'

/**
 * A2A 消息格式（JSON-RPC 2.0）
 */
export interface A2AMessage {
  /** JSON-RPC 版本 */
  jsonrpc: '2.0'
  /** 消息 ID */
  id: string
  /** 方法名 */
  method?: string
  /** 参数 */
  params?: any
  /** 结果 */
  result?: any
  /** 错误 */
  error?: A2AError
}

/**
 * A2A 错误格式
 */
export interface A2AError {
  /** 错误代码 */
  code: number
  /** 错误消息 */
  message: string
  /** 错误数据 */
  data?: any
}

/**
 * Agent Card（智能体卡片）
 */
export interface AgentCard {
  /** Agent ID */
  agentId: string
  /** Agent 名称 */
  name: string
  /** Agent 版本 */
  version: string
  /** Agent 描述 */
  description: string
  /** Agent 能力列表 */
  capabilities: Capability[]
  /** 认证配置 */
  authentication?: {
    type: 'none' | 'api_key' | 'oauth' | 'did'
    required: boolean
    config?: Record<string, any>
  }
  /** 端点配置 */
  endpoints: {
    /** 任务执行端点 */
    task?: string
    /** 状态查询端点 */
    status?: string
    /** 结果获取端点 */
    result?: string
    /** 流式更新端点 */
    stream?: string
  }
  /** 元数据 */
  metadata?: Record<string, any>
}

/**
 * Agent 能力定义
 */
export interface Capability {
  /** 能力类型 */
  type: string
  /** 支持的操作 */
  actions: string[]
  /** 输入类型 */
  inputTypes?: string[]
  /** 输出类型 */
  outputTypes?: string[]
  /** 能力描述 */
  description?: string
}

/**
 * 任务请求参数
 */
export interface TaskRequestParams {
  /** 任务 ID */
  taskId: string
  /** 任务类型 */
  type: AgentType
  /** 任务描述 */
  description: string
  /** 任务参数 */
  params: Record<string, any>
  /** 任务优先级 */
  priority?: 'high' | 'medium' | 'low'
  /** 依赖任务 ID 列表 */
  dependencies?: string[]
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * 任务响应结果
 */
export interface TaskResponseResult {
  /** 任务 ID */
  taskId: string
  /** 任务状态 */
  status: TaskStatus
  /** 任务结果 */
  result?: any
  /** 进度（0-100） */
  progress?: number
  /** 消息 */
  message?: string
}

/**
 * A2A 协议客户端
 * 用于 Agent 之间发送消息
 */
export class A2AClient {
  private agentCards: Map<string, AgentCard> = new Map()

  /**
   * 注册 Agent Card
   */
  registerAgentCard(card: AgentCard): void {
    this.agentCards.set(card.agentId, card)
  }

  /**
   * 获取 Agent Card
   */
  getAgentCard(agentId: string): AgentCard | undefined {
    return this.agentCards.get(agentId)
  }

  /**
   * 发现可用的 Agent
   */
  discoverAgents(capabilityType?: string): AgentCard[] {
    const cards = Array.from(this.agentCards.values())
    
    if (capabilityType) {
      return cards.filter(card =>
        card.capabilities.some(cap => cap.type === capabilityType)
      )
    }
    
    return cards
  }

  /**
   * 发送任务请求（同步）
   */
  async sendTaskRequest(
    targetAgentId: string,
    params: TaskRequestParams
  ): Promise<TaskResponseResult> {
    const card = this.getAgentCard(targetAgentId)
    if (!card) {
      throw new Error(`Agent not found: ${targetAgentId}`)
    }

    const message: A2AMessage = {
      jsonrpc: '2.0',
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      method: 'execute_task',
      params
    }

    // 发送 HTTP 请求
    if (card.endpoints.task) {
      const response = await fetch(card.endpoints.task, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })

      const result: A2AMessage = await response.json()

      if (result.error) {
        throw new Error(`A2A Error: ${result.error.message}`)
      }

      return result.result as TaskResponseResult
    }

    throw new Error(`No task endpoint configured for agent: ${targetAgentId}`)
  }

  /**
   * 查询任务状态
   */
  async queryTaskStatus(
    targetAgentId: string,
    taskId: string
  ): Promise<TaskResponseResult> {
    const card = this.getAgentCard(targetAgentId)
    if (!card) {
      throw new Error(`Agent not found: ${targetAgentId}`)
    }

    const message: A2AMessage = {
      jsonrpc: '2.0',
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      method: 'query_status',
      params: { taskId }
    }

    if (card.endpoints.status) {
      const response = await fetch(card.endpoints.status, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })

      const result: A2AMessage = await response.json()

      if (result.error) {
        throw new Error(`A2A Error: ${result.error.message}`)
      }

      return result.result as TaskResponseResult
    }

    throw new Error(`No status endpoint configured for agent: ${targetAgentId}`)
  }

  /**
   * 订阅任务状态更新（SSE）
   */
  subscribeTaskStatus(
    targetAgentId: string,
    taskId: string,
    onUpdate: (status: TaskResponseResult) => void
  ): () => void {
    const card = this.getAgentCard(targetAgentId)
    if (!card || !card.endpoints.stream) {
      throw new Error(`No stream endpoint configured for agent: ${targetAgentId}`)
    }

    const eventSource = new EventSource(
      `${card.endpoints.stream}?taskId=${taskId}`
    )

    eventSource.addEventListener('status', (event) => {
      const data = JSON.parse(event.data)
      onUpdate(data as TaskResponseResult)
    })

    eventSource.addEventListener('result', (event) => {
      const data = JSON.parse(event.data)
      onUpdate(data as TaskResponseResult)
      eventSource.close()
    })

    eventSource.addEventListener('error', (event) => {
      console.error('SSE Error:', event)
      eventSource.close()
    })

    // 返回取消订阅函数
    return () => {
      eventSource.close()
    }
  }
}

/**
 * A2A 协议服务器
 * 用于接收和处理来自其他 Agent 的请求
 */
export class A2AServer {
  private agentId: string
  private handlers: Map<string, (params: any) => Promise<any>> = new Map()

  constructor(agentId: string) {
    this.agentId = agentId
  }

  /**
   * 注册方法处理器
   */
  registerMethod(method: string, handler: (params: any) => Promise<any>): void {
    this.handlers.set(method, handler)
  }

  /**
   * 处理 A2A 消息
   */
  async handleMessage(message: A2AMessage): Promise<A2AMessage> {
    if (message.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32600,
          message: 'Invalid Request'
        }
      }
    }

    if (!message.method) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32600,
          message: 'Method not specified'
        }
      }
    }

    const handler = this.handlers.get(message.method)
    if (!handler) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`
        }
      }
    }

    try {
      const result = await handler(message.params)
      return {
        jsonrpc: '2.0',
        id: message.id,
        result
      }
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error.message || 'Internal error',
          data: error
        }
      }
    }
  }

  /**
   * 创建 HTTP 处理函数（用于 Express/Koa 等框架）
   */
  createHttpHandler() {
    return async (req: any, res: any) => {
      try {
        const message: A2AMessage = req.body
        const response = await this.handleMessage(message)
        res.json(response)
      } catch (error: any) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: error.message || 'Internal error'
          }
        })
      }
    }
  }
}

/**
 * 错误代码定义
 */
export const A2AErrorCodes = {
  /** 解析错误 */
  PARSE_ERROR: -32700,
  /** 无效请求 */
  INVALID_REQUEST: -32600,
  /** 方法不存在 */
  METHOD_NOT_FOUND: -32601,
  /** 无效参数 */
  INVALID_PARAMS: -32602,
  /** 内部错误 */
  INTERNAL_ERROR: -32603,
  /** 任务不存在 */
  TASK_NOT_FOUND: -32001,
  /** 任务已存在 */
  TASK_ALREADY_EXISTS: -32002,
  /** Agent 不可用 */
  AGENT_UNAVAILABLE: -32003
}

