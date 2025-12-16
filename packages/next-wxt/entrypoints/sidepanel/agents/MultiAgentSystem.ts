/**
 * 多 Agent 系统主类
 * 整合 Orchestrator、WebSurfer 和 TaskDispatcher
 */

import { AgentManager } from './AgentManager'
import { TaskDispatcher } from './TaskDispatcher'
import type { AgentConfig, TaskPlan } from './types'
import { AgentType } from './types'

export class MultiAgentSystem {
  private agentManager: AgentManager
  private taskDispatcher: TaskDispatcher

  constructor() {
    this.agentManager = new AgentManager()
    this.taskDispatcher = new TaskDispatcher(this.agentManager)
  }

  /**
   * 初始化系统
   * 注册所有需要的 Agent
   */
  async initialize(configs: {
    orchestrator?: Partial<AgentConfig>
    websurfer?: Partial<AgentConfig>
  }): Promise<void> {
    // 注册 Orchestrator Agent（使用 DeepSeek）
    const orchestratorConfig: AgentConfig = {
      type: AgentType.ORCHESTRATOR,
      name: 'Orchestrator',
      description: '任务规划和协调 Agent',
      llmConfig: {
        model: configs.orchestrator?.llmConfig?.model || 'deepseek-ai/DeepSeek-V3',
        apiKey: configs.orchestrator?.llmConfig?.apiKey,
        baseURL: configs.orchestrator?.llmConfig?.baseURL,
        providerType: configs.orchestrator?.llmConfig?.providerType || 'deepseek'
      },
      systemPrompt: configs.orchestrator?.systemPrompt || `你是一个任务规划专家（Orchestrator）。你的职责是理解用户指令，将复杂任务分解为多个子任务，并为每个子任务分配合适的 Agent。`,
      maxSteps: configs.orchestrator?.maxSteps || 15
    }

    await this.agentManager.registerAgent(orchestratorConfig)

    // 注册 WebSurfer Agent（使用 FARA-7B）
    const websurferConfig: AgentConfig = {
      type: AgentType.WEBSURFER,
      name: 'WebSurfer',
      description: '浏览器操作 Agent，使用视觉模型分析页面并执行操作',
      llmConfig: {
        model: configs.websurfer?.llmConfig?.model || 'microsoft/Fara-7B',
        apiKey: configs.websurfer?.llmConfig?.apiKey,
        baseURL: configs.websurfer?.llmConfig?.baseURL || 'http://localhost:5000/v1', // FARA-7B 本地服务地址
        providerType: configs.websurfer?.llmConfig?.providerType || 'openai'
      },
      systemPrompt: configs.websurfer?.systemPrompt || `你是一个专业的浏览器操作助手（WebSurfer）。你的职责是分析页面截图，理解操作需求，识别元素位置，并执行浏览器操作。`,
      tools: configs.websurfer?.tools || ['takeScreenshot', 'clickByCoordinate', 'fill', 'scrollPage'],
      maxSteps: configs.websurfer?.maxSteps || 10
    }

    await this.agentManager.registerAgent(websurferConfig)
  }

  /**
   * 处理用户指令
   * 1. Orchestrator 生成任务计划
   * 2. TaskDispatcher 分发任务
   * 3. 各 Agent 执行任务
   */
  async processUserInstruction(userInstruction: string): Promise<TaskPlan> {
    // 1. 获取 Orchestrator Agent
    const orchestrator = this.agentManager.getAgentByType(AgentType.ORCHESTRATOR)
    if (!orchestrator) {
      throw new Error('Orchestrator agent not found. Please initialize the system first.')
    }

    // 2. 调用 Orchestrator 生成任务计划
    // 这里需要访问 OrchestratorAgent 实例，实际实现需要调整架构
    // 暂时使用 TaskDispatcher 的 createPlan 方法
    const plan = await this.taskDispatcher.createPlan(userInstruction)

    // 3. 分发任务
    for (const task of plan.tasks) {
      await this.taskDispatcher.dispatchTask(task)
    }

    return plan
  }

  /**
   * 获取任务计划状态
   */
  getPlanStatus(planId: string): TaskPlan | undefined {
    return this.taskDispatcher.getPlan(planId)
  }

  /**
   * 获取所有 Agent 状态
   */
  getAllAgentsStatus() {
    return this.agentManager.getAllAgents()
  }

  /**
   * 取消任务计划
   */
  async cancelPlan(planId: string): Promise<void> {
    await this.taskDispatcher.cancelPlan(planId)
  }
}

