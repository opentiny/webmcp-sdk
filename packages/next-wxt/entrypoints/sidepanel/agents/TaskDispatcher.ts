/**
 * 任务分发器
 * 负责将任务分配给合适的 Agent
 */

import type { Task, TaskPlan, AgentInstance, AgentType } from './types'
import { TaskStatus, TaskPriority, AgentType as AgentTypeEnum } from './types'
import { AgentManager } from './AgentManager'
import { OrchestratorAgent } from './OrchestratorAgent'
import { WebSurferAgent } from './WebSurferAgent'

// 简单的 UUID 生成函数
function generateUUID(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export class TaskDispatcher {
  private agentManager: AgentManager
  /** 任务计划映射表 */
  private plans: Map<string, TaskPlan> = new Map()
  /** 任务映射表 */
  private tasks: Map<string, Task> = new Map()

  constructor(agentManager: AgentManager) {
    this.agentManager = agentManager
  }

  /**
   * 创建任务计划
   */
  async createPlan(userInstruction: string): Promise<TaskPlan> {
    // 获取 Orchestrator Agent
    const orchestrator = this.agentManager.getAgentByType(AgentTypeEnum.ORCHESTRATOR)
    if (!orchestrator) {
      throw new Error('Orchestrator agent not found')
    }

    // 获取 Orchestrator 实现类
    const orchestratorImpl = this.agentManager.getAgentImplementation(orchestrator.id)
    if (!orchestratorImpl || !(orchestratorImpl instanceof OrchestratorAgent)) {
      throw new Error('Orchestrator implementation not found')
    }

    // 调用 Orchestrator 生成任务计划
    const plan = await orchestratorImpl.generatePlan(userInstruction)

    this.plans.set(plan.id, plan)

    return plan
  }

  /**
   * 分发任务到 Agent
   */
  async dispatchTask(task: Task): Promise<void> {
    // 检查依赖任务是否完成
    if (task.dependencies && task.dependencies.length > 0) {
      const allDependenciesCompleted = task.dependencies.every((depId) => {
        const depTask = this.tasks.get(depId)
        return depTask && depTask.status === TaskStatus.COMPLETED
      })

      if (!allDependenciesCompleted) {
        // 依赖任务未完成，等待
        return
      }
    }

    // 根据任务类型选择合适的 Agent
    const agent = this.agentManager.getAgentByType(task.type)
    if (!agent) {
      throw new Error(`No available agent for task type: ${task.type}`)
    }

    // 将任务添加到 Agent 队列
    agent.taskQueue.push(task)
    this.tasks.set(task.id, task)

    // 如果 Agent 空闲，立即执行任务
    if (agent.status === 'idle') {
      this.executeTask(agent, task)
    }
  }

  /**
   * 执行任务
   */
  private async executeTask(agent: AgentInstance, task: Task): Promise<void> {
    agent.status = 'busy'
    agent.currentTask = task
    task.status = TaskStatus.RUNNING
    task.startedAt = Date.now()

    try {
      // 这里应该调用对应 Agent 的执行方法
      // 实际实现需要根据 Agent 类型调用不同的执行逻辑
      const result = await this.executeAgentTask(agent, task)

      task.status = TaskStatus.COMPLETED
      task.completedAt = Date.now()
      task.result = result

      // 更新 Agent 统计信息
      const executionTime = (task.completedAt - task.startedAt!) / 1000
      this.agentManager.updateAgentStats(agent.id, {
        completedTasks: agent.stats.completedTasks + 1,
        totalExecutionTime: agent.stats.totalExecutionTime + executionTime
      })

      // 检查是否有等待此任务完成的其他任务
      this.checkDependentTasks(task.id)
    } catch (error: any) {
      task.status = TaskStatus.FAILED
      task.error = error.message
      task.completedAt = Date.now()

      // 更新 Agent 统计信息
      this.agentManager.updateAgentStats(agent.id, {
        failedTasks: agent.stats.failedTasks + 1
      })
    } finally {
      agent.currentTask = undefined
      agent.status = 'idle'

      // 执行队列中的下一个任务
      if (agent.taskQueue.length > 0) {
        const nextTask = agent.taskQueue.shift()!
        this.executeTask(agent, nextTask)
      }
    }
  }

  /**
   * 执行 Agent 任务
   */
  private async executeAgentTask(agent: AgentInstance, task: Task): Promise<any> {
    // 获取 Agent 实现类
    const agentImpl = this.agentManager.getAgentImplementation(agent.id)
    if (!agentImpl) {
      throw new Error(`Agent implementation not found: ${agent.id}`)
    }

    // 根据 Agent 类型调用不同的执行方法
    if (agentImpl instanceof WebSurferAgent) {
      return await agentImpl.executeTask(task)
    } else if (agentImpl instanceof OrchestratorAgent) {
      // Orchestrator 通常不执行任务，只负责规划
      throw new Error('Orchestrator agent should not execute tasks')
    } else {
      throw new Error(`Unsupported agent type: ${agent.config.type}`)
    }
  }

  /**
   * 检查依赖任务
   */
  private checkDependentTasks(completedTaskId: string): void {
    for (const task of this.tasks.values()) {
      if (task.dependencies && task.dependencies.includes(completedTaskId)) {
        // 依赖任务已完成，尝试分发此任务
        if (task.status === TaskStatus.PENDING) {
          this.dispatchTask(task)
        }
      }
    }
  }

  /**
   * 获取任务计划
   */
  getPlan(planId: string): TaskPlan | undefined {
    return this.plans.get(planId)
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有任务计划
   */
  getAllPlans(): TaskPlan[] {
    return Array.from(this.plans.values())
  }

  /**
   * 取消任务计划
   */
  async cancelPlan(planId: string): Promise<void> {
    const plan = this.plans.get(planId)
    if (plan) {
      plan.status = TaskStatus.CANCELLED

      // 取消所有未完成的任务
      for (const task of plan.tasks) {
        if (task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING) {
          task.status = TaskStatus.CANCELLED
        }
      }
    }
  }
}
