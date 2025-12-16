/**
 * Orchestrator Agent（协调器）
 * 使用 DeepSeek 作为主 LLM，负责任务规划和分配
 */

import type { AgentConfig, Task, TaskPlan } from './types'
import { TaskStatus } from './types'
import { AgentModelProvider } from '@opentiny/next-sdk'
import type { IAgentModelProviderOption } from '@opentiny/next-sdk'

export class OrchestratorAgent {
  private id: string
  private config: AgentConfig
  private agent: AgentModelProvider | null = null

  constructor(id: string, config: AgentConfig) {
    this.id = id
    this.config = config
  }

  /**
   * 初始化 Agent
   */
  async initialize(): Promise<void> {
    const llmConfig = {
      model: this.config.llmConfig.model,
      apiKey: this.config.llmConfig.apiKey,
      baseURL: this.config.llmConfig.baseURL,
      providerType: this.config.llmConfig.providerType || 'deepseek'
    }

    const options: IAgentModelProviderOption = {
      llmConfig,
      mcpServers: {} // Orchestrator 不需要 MCP 工具，它只负责规划
    }

    this.agent = new AgentModelProvider(options)
  }

  /**
   * 生成任务计划
   * @param userInstruction 用户指令
   * @returns 任务计划
   */
  async generatePlan(userInstruction: string): Promise<TaskPlan> {
    if (!this.agent) {
      throw new Error('Agent not initialized')
    }

    const systemPrompt = `你是一个任务规划专家（Orchestrator）。你的职责是：
1. 理解用户的指令
2. 将复杂任务分解为多个子任务
3. 为每个子任务分配合适的 Agent 类型
4. 确定任务之间的依赖关系
5. 生成详细的任务计划

可用的 Agent 类型：
- websurfer: 负责浏览器操作（点击、输入、滚动、截图等）
- coder: 负责代码编写和执行
- filesurfer: 负责文件系统操作

请根据用户指令生成任务计划，返回 JSON 格式：
{
  "tasks": [
    {
      "type": "websurfer",
      "description": "任务描述",
      "params": {},
      "priority": "high|medium|low",
      "dependencies": []
    }
  ]
}`

    const prompt = `用户指令：${userInstruction}

请生成详细的任务计划。`

    try {
      // 调用 LLM 生成任务计划
      const response = await this.agent.chat([
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: prompt
        }
      ])

      // 解析 LLM 返回的任务计划
      const planJson = this.parsePlanFromResponse(response)
      return planJson
    } catch (error: any) {
      throw new Error(`Failed to generate plan: ${error.message}`)
    }
  }

  /**
   * 从 LLM 响应中解析任务计划
   */
  private parsePlanFromResponse(response: any): TaskPlan {
    // 尝试从响应中提取 JSON
    const text = response.text || response.content || JSON.stringify(response)

    // 提取 JSON 部分（可能在代码块中）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text

    try {
      const parsed = JSON.parse(jsonStr)

      // 构建任务计划
      const tasks: Task[] = (parsed.tasks || []).map((task: any, index: number) => ({
        id: `task-${Date.now()}-${index}`,
        type: task.type,
        description: task.description,
        params: task.params || {},
        status: 'pending' as const,
        priority: task.priority || ('medium' as const),
        createdAt: Date.now(),
        dependencies: task.dependencies || []
      }))

      return {
        id: `plan-${Date.now()}`,
        userInstruction: parsed.userInstruction || '',
        tasks,
        status: TaskStatus.PENDING,
        createdAt: Date.now()
      }
    } catch (error) {
      throw new Error(`Failed to parse plan from response: ${error}`)
    }
  }

  /**
   * 获取 Agent ID
   */
  getId(): string {
    return this.id
  }

  /**
   * 获取 Agent 配置
   */
  getConfig(): AgentConfig {
    return this.config
  }
}
