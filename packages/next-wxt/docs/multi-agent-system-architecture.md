# 多 Agent 系统架构设计文档

## 概述

本文档描述了一个多 Agent 系统的架构设计，该系统使用 DeepSeek 作为主 LLM（Orchestrator），FARA-7B 作为专门解析操作浏览器的 LLM（WebSurfer），通过任务分发管理系统协同完成复杂任务。

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                  MultiAgentSystem                        │
│                  (多 Agent 系统)                         │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                     │
┌───────────────────┐              ┌───────────────────┐
│  AgentManager     │              │  TaskDispatcher   │
│  (Agent 管理器)   │              │  (任务分发器)     │
└───────────────────┘              └───────────────────┘
        │                                     │
        ├── OrchestratorAgent                 │
        │   (DeepSeek)                        │
        │                                     │
        └── WebSurferAgent                    │
            (FARA-7B)                         │
                                              │
                                    ┌─────────┴─────────┐
                                    │                   │
                            ┌───────────────┐   ┌───────────────┐
                            │   Task Queue  │   │  Task Plan    │
                            └───────────────┘   └───────────────┘
```

### 核心组件

#### 1. MultiAgentSystem（多 Agent 系统主类）

**职责**：
- 系统初始化和配置
- 协调各组件工作
- 提供统一的对外接口

**主要方法**：
- `initialize()`: 初始化系统，注册所有 Agent
- `processUserInstruction()`: 处理用户指令，生成任务计划并执行
- `getPlanStatus()`: 获取任务计划状态
- `cancelPlan()`: 取消任务计划

#### 2. AgentManager（Agent 管理器）

**职责**：
- 管理所有 Agent 实例的生命周期
- 根据类型查找和分配 Agent
- 跟踪 Agent 状态和统计信息

**主要方法**：
- `registerAgent()`: 注册 Agent
- `getAgent()`: 获取指定 Agent
- `getAgentByType()`: 根据类型获取 Agent
- `updateAgentStatus()`: 更新 Agent 状态

#### 3. TaskDispatcher（任务分发器）

**职责**：
- 接收 Orchestrator 生成的任务计划
- 将任务分配给合适的 Agent
- 管理任务依赖关系
- 跟踪任务执行状态

**主要方法**：
- `createPlan()`: 创建任务计划（调用 Orchestrator）
- `dispatchTask()`: 分发任务到 Agent
- `getPlan()`: 获取任务计划
- `cancelPlan()`: 取消任务计划

#### 4. OrchestratorAgent（协调器 Agent）

**职责**：
- 使用 DeepSeek 理解用户指令
- 将复杂任务分解为子任务
- 为每个子任务分配合适的 Agent 类型
- 确定任务依赖关系

**主要方法**：
- `generatePlan()`: 生成任务计划
- `initialize()`: 初始化 Agent

**LLM 配置**：
- 模型：DeepSeek-V3
- 用途：任务规划和协调

#### 5. WebSurferAgent（网页浏览 Agent）

**职责**：
- 使用 FARA-7B 分析页面截图
- 识别需要操作的元素位置
- 执行浏览器操作（点击、输入、滚动等）

**主要方法**：
- `executeTask()`: 执行浏览器操作任务
- `handleVisionTask()`: 处理视觉任务（截图 + 分析 + 操作）
- `initialize()`: 初始化 Agent

**LLM 配置**：
- 模型：FARA-7B
- 用途：浏览器操作和视觉分析

## 工作流程

### 1. 系统初始化流程

```
1. 创建 MultiAgentSystem 实例
   ↓
2. 调用 initialize() 方法
   ↓
3. AgentManager 注册 OrchestratorAgent（DeepSeek）
   ↓
4. AgentManager 注册 WebSurferAgent（FARA-7B）
   ↓
5. 系统就绪
```

### 2. 任务处理流程

```
用户指令
   ↓
MultiAgentSystem.processUserInstruction()
   ↓
获取 OrchestratorAgent
   ↓
OrchestratorAgent.generatePlan()
   ├─→ DeepSeek 分析用户指令
   ├─→ 分解为子任务
   ├─→ 分配 Agent 类型
   └─→ 确定依赖关系
   ↓
TaskDispatcher.createPlan()
   ↓
TaskDispatcher.dispatchTask()
   ├─→ 检查任务依赖
   ├─→ 选择合适的 Agent
   └─→ 将任务加入 Agent 队列
   ↓
WebSurferAgent.executeTask()
   ├─→ 截图（如果需要）
   ├─→ FARA-7B 分析截图
   ├─→ 识别操作元素
   └─→ 执行浏览器操作
   ↓
任务完成，更新状态
   ↓
检查依赖任务，继续执行
```

### 3. 视觉任务处理流程（WebSurfer）

```
任务描述
   ↓
WebSurferAgent.handleVisionTask()
   ↓
1. 截图
   ├─→ takeScreenshot()
   └─→ 获取 base64 图片
   ↓
2. 视觉分析
   ├─→ 将截图 + 任务描述发送给 FARA-7B
   ├─→ FARA-7B 分析截图
   └─→ 返回操作指令（坐标、操作类型）
   ↓
3. 执行操作
   ├─→ 解析操作指令
   ├─→ clickByCoordinate(x, y)
   ├─→ fill(selector, text)
   └─→ scrollPage()
   ↓
4. 验证结果
   └─→ 返回执行结果
```

## 使用示例

### 1. 初始化系统

```typescript
import { MultiAgentSystem } from './agents/MultiAgentSystem'

// 创建系统实例
const system = new MultiAgentSystem()

// 初始化系统，配置 Agent
await system.initialize({
  orchestrator: {
    llmConfig: {
      model: 'deepseek-ai/DeepSeek-V3',
      apiKey: 'your-deepseek-api-key',
      baseURL: 'https://api.deepseek.com/v1',
      providerType: 'deepseek'
    }
  },
  websurfer: {
    llmConfig: {
      model: 'microsoft/Fara-7B',
      apiKey: 'not-needed', // FARA-7B 本地运行不需要 API Key
      baseURL: 'http://localhost:5000/v1', // 本地 vLLM 服务
      providerType: 'openai'
    }
  }
})
```

### 2. 处理用户指令

```typescript
// 用户指令
const userInstruction = '帮我在百度搜索"AI技术"，然后打开第一个搜索结果'

// 处理指令
const plan = await system.processUserInstruction(userInstruction)

console.log('任务计划 ID:', plan.id)
console.log('任务列表:', plan.tasks)

// 监控任务执行状态
const checkStatus = setInterval(async () => {
  const currentPlan = system.getPlanStatus(plan.id)
  console.log('计划状态:', currentPlan?.status)
  console.log('任务进度:', 
    currentPlan?.tasks.filter(t => t.status === 'completed').length,
    '/',
    currentPlan?.tasks.length
  )
  
  if (currentPlan?.status === 'completed' || currentPlan?.status === 'failed') {
    clearInterval(checkStatus)
  }
}, 1000)
```

### 3. 查看 Agent 状态

```typescript
// 获取所有 Agent 状态
const agents = system.getAllAgentsStatus()

agents.forEach(agent => {
  console.log(`Agent: ${agent.config.name}`)
  console.log(`状态: ${agent.status}`)
  console.log(`完成任务: ${agent.stats.completedTasks}`)
  console.log(`失败任务: ${agent.stats.failedTasks}`)
  console.log(`总执行时间: ${agent.stats.totalExecutionTime}s`)
})
```

## 配置说明

### Orchestrator Agent 配置

```typescript
{
  type: 'orchestrator',
  name: 'Orchestrator',
  llmConfig: {
    model: 'deepseek-ai/DeepSeek-V3',
    apiKey: 'your-api-key',
    baseURL: 'https://api.deepseek.com/v1',
    providerType: 'deepseek'
  },
  systemPrompt: '你是一个任务规划专家...',
  maxSteps: 15
}
```

### WebSurfer Agent 配置

```typescript
{
  type: 'websurfer',
  name: 'WebSurfer',
  llmConfig: {
    model: 'microsoft/Fara-7B',
    apiKey: 'not-needed',
    baseURL: 'http://localhost:5000/v1', // vLLM 服务地址
    providerType: 'openai'
  },
  systemPrompt: '你是一个专业的浏览器操作助手...',
  tools: ['takeScreenshot', 'clickByCoordinate', 'fill', 'scrollPage'],
  maxSteps: 10
}
```

## FARA-7B 部署

### 使用 vLLM 部署 FARA-7B

```bash
# 安装 vLLM
pip install vllm

# 启动 FARA-7B 服务
vllm serve "microsoft/Fara-7B" --port 5000 --dtype auto
```

### 配置 OpenAI 兼容 API

FARA-7B 通过 vLLM 提供 OpenAI 兼容的 API，可以直接使用 OpenAI Provider：

```typescript
{
  providerType: 'openai',
  baseURL: 'http://localhost:5000/v1',
  apiKey: 'not-needed'
}
```

## 扩展性设计

### 添加新的 Agent 类型

1. **定义 Agent 类型**：
```typescript
// types.ts
export enum AgentType {
  // ... 现有类型
  CODER = 'coder',
  FILESURFER = 'filesurfer'
}
```

2. **实现 Agent 类**：
```typescript
// CoderAgent.ts
export class CoderAgent {
  async executeTask(task: Task): Promise<any> {
    // 实现代码执行逻辑
  }
}
```

3. **在 AgentManager 中注册**：
```typescript
// AgentManager.ts
case 'coder':
  agent = new CoderAgent(agentId, config)
  break
```

4. **在 MultiAgentSystem 中初始化**：
```typescript
// MultiAgentSystem.ts
await this.agentManager.registerAgent(coderConfig)
```

## 最佳实践

### 1. 任务规划

- **任务粒度**：将任务分解为足够小的子任务，每个子任务应该可以由一个 Agent 独立完成
- **依赖关系**：明确任务之间的依赖关系，确保任务按正确顺序执行
- **优先级**：为任务设置合理的优先级，重要任务优先执行

### 2. Agent 选择

- **Orchestrator**：用于任务规划、协调和决策
- **WebSurfer**：用于所有浏览器相关操作
- **未来扩展**：Coder（代码执行）、FileSurfer（文件操作）等

### 3. 错误处理

- **任务失败**：记录错误信息，更新任务状态
- **重试机制**：对于可重试的任务，实现自动重试
- **降级策略**：当某个 Agent 不可用时，使用备用方案

### 4. 性能优化

- **并发执行**：独立任务可以并发执行
- **资源管理**：合理管理浏览器连接池等资源
- **缓存机制**：缓存截图、任务计划等，避免重复计算

## 总结

这个多 Agent 系统架构提供了：

1. **清晰的职责分离**：每个 Agent 专注于特定领域
2. **灵活的任务规划**：Orchestrator 可以根据任务特点分配合适的 Agent
3. **可扩展性**：易于添加新的 Agent 类型
4. **可维护性**：模块化设计，易于测试和维护

通过 DeepSeek 的强大规划能力和 FARA-7B 的专业视觉分析能力，系统可以高效地完成复杂的浏览器自动化任务。

