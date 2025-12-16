/**
 * 多 Agent 系统类型定义
 */

/**
 * Agent 类型
 */
export enum AgentType {
  /** 协调器 Agent（主 Agent，使用 DeepSeek） */
  ORCHESTRATOR = 'orchestrator',
  /** 网页浏览 Agent（使用 FARA-7B） */
  WEBSURFER = 'websurfer',
  /** 代码执行 Agent */
  CODER = 'coder',
  /** 文件操作 Agent */
  FILESURFER = 'filesurfer'
}

/**
 * 任务状态
 */
export enum TaskStatus {
  /** 待执行 */
  PENDING = 'pending',
  /** 执行中 */
  RUNNING = 'running',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled'
}

/**
 * 任务优先级
 */
export enum TaskPriority {
  /** 高优先级 */
  HIGH = 'high',
  /** 中优先级 */
  MEDIUM = 'medium',
  /** 低优先级 */
  LOW = 'low'
}

/**
 * 任务定义
 */
export interface Task {
  /** 任务 ID */
  id: string
  /** 任务类型 */
  type: AgentType
  /** 任务描述 */
  description: string
  /** 任务参数 */
  params: Record<string, any>
  /** 任务状态 */
  status: TaskStatus
  /** 任务优先级 */
  priority: TaskPriority
  /** 创建时间 */
  createdAt: number
  /** 开始时间 */
  startedAt?: number
  /** 完成时间 */
  completedAt?: number
  /** 任务结果 */
  result?: any
  /** 错误信息 */
  error?: string
  /** 依赖任务 ID 列表 */
  dependencies?: string[]
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** Agent 类型 */
  type: AgentType
  /** Agent 名称 */
  name: string
  /** Agent 描述 */
  description: string
  /** LLM 配置 */
  llmConfig: {
    /** 模型名称 */
    model: string
    /** API Key */
    apiKey?: string
    /** Base URL */
    baseURL?: string
    /** Provider 类型 */
    providerType?: string
  }
  /** 系统提示词 */
  systemPrompt: string
  /** 可用工具列表 */
  tools?: string[]
  /** 最大执行步骤 */
  maxSteps?: number
}

/**
 * Agent 实例
 */
export interface AgentInstance {
  /** Agent ID */
  id: string
  /** Agent 配置 */
  config: AgentConfig
  /** Agent 状态 */
  status: 'idle' | 'busy' | 'error'
  /** 当前任务 */
  currentTask?: Task
  /** 任务队列 */
  taskQueue: Task[]
  /** 统计信息 */
  stats: {
    /** 完成任务数 */
    completedTasks: number
    /** 失败任务数 */
    failedTasks: number
    /** 总执行时间 */
    totalExecutionTime: number
  }
}

/**
 * 任务计划
 */
export interface TaskPlan {
  /** 计划 ID */
  id: string
  /** 用户指令 */
  userInstruction: string
  /** 任务列表 */
  tasks: Task[]
  /** 计划状态 */
  status: TaskStatus
  /** 创建时间 */
  createdAt: number
  /** 完成时间 */
  completedAt?: number
}

/**
 * Agent 通信消息
 */
export interface AgentMessage {
  /** 消息 ID */
  id: string
  /** 发送者 Agent ID */
  from: string
  /** 接收者 Agent ID */
  to: string
  /** 消息类型 */
  type: 'task' | 'result' | 'error' | 'status'
  /** 消息内容 */
  content: any
  /** 时间戳 */
  timestamp: number
}
