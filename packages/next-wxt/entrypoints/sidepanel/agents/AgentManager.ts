/**
 * Agent 管理器
 * 负责管理所有 Agent 实例的生命周期
 */

import type { AgentInstance, AgentConfig, AgentType } from './types'
import { OrchestratorAgent } from './OrchestratorAgent'
import { WebSurferAgent } from './WebSurferAgent'

export class AgentManager {
  /** Agent 实例映射表 */
  private agents: Map<string, AgentInstance> = new Map()
  /** Agent 实现类映射表 */
  private agentImplementations: Map<string, OrchestratorAgent | WebSurferAgent> = new Map()

  /**
   * 注册 Agent
   */
  async registerAgent(config: AgentConfig): Promise<AgentInstance> {
    const agentId = `${config.type}-${Date.now()}`

    // 根据类型创建对应的 Agent 实例
    let agent: OrchestratorAgent | WebSurferAgent
    switch (config.type) {
      case 'orchestrator':
        agent = new OrchestratorAgent(agentId, config)
        break
      case 'websurfer':
        agent = new WebSurferAgent(agentId, config)
        break
      default:
        throw new Error(`Unsupported agent type: ${config.type}`)
    }

    const instance: AgentInstance = {
      id: agentId,
      config,
      status: 'idle',
      taskQueue: [],
      stats: {
        completedTasks: 0,
        failedTasks: 0,
        totalExecutionTime: 0
      }
    }

    this.agents.set(agentId, instance)
    this.agentImplementations.set(agentId, agent)

    // 初始化 Agent
    await agent.initialize()

    return instance
  }

  /**
   * 获取 Agent 实现类
   */
  getAgentImplementation(agentId: string): OrchestratorAgent | WebSurferAgent | undefined {
    return this.agentImplementations.get(agentId)
  }

  /**
   * 获取 Agent 实例
   */
  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId)
  }

  /**
   * 根据类型获取 Agent
   */
  getAgentByType(type: AgentType): AgentInstance | undefined {
    for (const agent of this.agents.values()) {
      if (agent.config.type === type && agent.status === 'idle') {
        return agent
      }
    }
    return undefined
  }

  /**
   * 获取所有 Agent
   */
  getAllAgents(): AgentInstance[] {
    return Array.from(this.agents.values())
  }

  /**
   * 获取指定类型的所有 Agent
   */
  getAgentsByType(type: AgentType): AgentInstance[] {
    return Array.from(this.agents.values()).filter((agent) => agent.config.type === type)
  }

  /**
   * 移除 Agent
   */
  async removeAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId)
    if (agent) {
      // 清理 Agent 资源
      if (agent.currentTask) {
        // 取消当前任务
        agent.currentTask.status = TaskStatus.CANCELLED
      }
      this.agents.delete(agentId)
    }
  }

  /**
   * 更新 Agent 状态
   */
  updateAgentStatus(agentId: string, status: AgentInstance['status']): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.status = status
    }
  }

  /**
   * 更新 Agent 统计信息
   */
  updateAgentStats(agentId: string, stats: Partial<AgentInstance['stats']>): void {
    const agent = this.agents.get(agentId)
    if (agent) {
      agent.stats = { ...agent.stats, ...stats }
    }
  }
}
