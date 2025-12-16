/**
 * A2A 协议集成
 * 将 A2A 协议集成到多 Agent 系统中
 */

import { A2AClient, A2AServer, type AgentCard, type TaskRequestParams } from './A2AProtocol'
import { AgentManager } from './AgentManager'
import { TaskDispatcher } from './TaskDispatcher'
import type { AgentType, Task } from './types'
import { AgentType as AgentTypeEnum } from './types'

/**
 * A2A 协议集成类
 * 为多 Agent 系统提供 A2A 协议支持
 */
export class A2AIntegration {
  private client: A2AClient
  private servers: Map<string, A2AServer> = new Map()
  private agentManager: AgentManager
  private taskDispatcher: TaskDispatcher

  constructor(agentManager: AgentManager, taskDispatcher: TaskDispatcher) {
    this.client = new A2AClient()
    this.agentManager = agentManager
    this.taskDispatcher = taskDispatcher
  }

  /**
   * 注册 Agent 到 A2A 网络
   */
  async registerAgent(agentId: string, card: AgentCard): Promise<void> {
    // 注册 Agent Card
    this.client.registerAgentCard(card)

    // 创建 A2A Server 用于接收请求
    const server = new A2AServer(agentId)

    // 注册任务执行方法
    server.registerMethod('execute_task', async (params: TaskRequestParams) => {
      // 将 A2A 任务请求转换为内部任务格式
      const task: Task = {
        id: params.taskId,
        type: params.type,
        description: params.description,
        params: params.params,
        status: 'pending' as const,
        priority: params.priority || 'medium' as const,
        createdAt: Date.now(),
        dependencies: params.dependencies
      }

      // 通过 TaskDispatcher 分发任务
      await this.taskDispatcher.dispatchTask(task)

      // 返回任务 ID
      return {
        taskId: task.id,
        status: task.status,
        message: 'Task accepted'
      }
    })

    // 注册状态查询方法
    server.registerMethod('query_status', async (params: { taskId: string }) => {
      const task = this.taskDispatcher.getTask(params.taskId)
      if (!task) {
        throw new Error(`Task not found: ${params.taskId}`)
      }

      return {
        taskId: task.id,
        status: task.status,
        result: task.result,
        error: task.error
      }
    })

    // 注册能力查询方法
    server.registerMethod('get_capabilities', async () => {
      return card.capabilities
    })

    this.servers.set(agentId, server)
  }

  /**
   * 委托任务给其他 Agent
   */
  async delegateTask(
    targetAgentId: string,
    taskType: AgentType,
    description: string,
    params: Record<string, any>
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const taskParams: TaskRequestParams = {
      taskId,
      type: taskType,
      description,
      params
    }

    // 通过 A2A 协议发送任务请求
    const result = await this.client.sendTaskRequest(targetAgentId, taskParams)

    return result.taskId
  }

  /**
   * 查询任务状态
   */
  async queryTaskStatus(targetAgentId: string, taskId: string): Promise<any> {
    return await this.client.queryTaskStatus(targetAgentId, taskId)
  }

  /**
   * 订阅任务状态更新
   */
  subscribeTaskStatus(
    targetAgentId: string,
    taskId: string,
    onUpdate: (status: any) => void
  ): () => void {
    return this.client.subscribeTaskStatus(targetAgentId, taskId, onUpdate)
  }

  /**
   * 发现可用的 Agent
   */
  discoverAgents(capabilityType?: string): AgentCard[] {
    return this.client.discoverAgents(capabilityType)
  }

  /**
   * 获取 A2A Server（用于 HTTP 集成）
   */
  getServer(agentId: string): A2AServer | undefined {
    return this.servers.get(agentId)
  }

  /**
   * 创建 Agent Card（辅助函数）
   */
  static createAgentCard(
    agentId: string,
    name: string,
    description: string,
    capabilities: AgentCard['capabilities'],
    endpoints: AgentCard['endpoints']
  ): AgentCard {
    return {
      agentId,
      name,
      version: '1.0.0',
      description,
      capabilities,
      authentication: {
        type: 'none',
        required: false
      },
      endpoints
    }
  }
}

/**
 * 创建 WebSurfer Agent Card
 */
export function createWebSurferCard(agentId: string, baseUrl: string): AgentCard {
  return A2AIntegration.createAgentCard(
    agentId,
    'WebSurfer Agent',
    '专业的浏览器操作助手，使用视觉模型分析页面并执行操作',
    [
      {
        type: 'browser_operation',
        actions: ['click', 'input', 'scroll', 'screenshot', 'navigate'],
        inputTypes: ['text', 'image', 'coordinates'],
        outputTypes: ['text', 'image', 'status'],
        description: '浏览器操作能力'
      }
    ],
    {
      task: `${baseUrl}/a2a/task`,
      status: `${baseUrl}/a2a/status`,
      result: `${baseUrl}/a2a/result`,
      stream: `${baseUrl}/a2a/stream`
    }
  )
}

/**
 * 创建 Orchestrator Agent Card
 */
export function createOrchestratorCard(agentId: string, baseUrl: string): AgentCard {
  return A2AIntegration.createAgentCard(
    agentId,
    'Orchestrator Agent',
    '任务规划和协调 Agent，负责分解任务并分配给合适的 Agent',
    [
      {
        type: 'task_planning',
        actions: ['plan', 'delegate', 'coordinate'],
        inputTypes: ['text'],
        outputTypes: ['task_plan'],
        description: '任务规划能力'
      }
    ],
    {
      task: `${baseUrl}/a2a/task`,
      status: `${baseUrl}/a2a/status`
    }
  )
}

