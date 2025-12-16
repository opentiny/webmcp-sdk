# A2A（Agent-to-Agent）协议详解

## 概述

A2A（Agent-to-Agent）协议是由谷歌于2025年4月推出的开放标准，旨在实现不同AI智能体之间的无缝通信与协作。该协议允许由不同供应商构建或使用不同技术框架的智能体在动态、多智能体的生态系统中有效地互操作。

## 核心目标

### 1. 互操作性（Interoperability）

弥合不同智能体系统之间的通信鸿沟，使其能够安全地交换信息并协同执行复杂任务。

**关键特性**：
- 标准化的消息格式
- 统一的通信接口
- 跨平台、跨厂商的兼容性

### 2. 协作能力（Collaboration）

使智能体能够委托任务、交换上下文，并在复杂的用户请求上协同工作。

**关键特性**：
- 任务委托机制
- 上下文共享
- 协同执行

### 3. 服务发现（Service Discovery）

通过 Agent Card 机制，智能体可以发现和识别彼此的能力，实现自动化服务发现和协作对接。

**关键特性**：
- Agent Card（智能体卡片）
- 能力描述
- 自动发现

## 核心组件

### 1. Agent Card（智能体卡片）

Agent Card 是 JSON 格式的公共元数据文件，描述智能体的能力和认证需求。

**结构示例**：

```json
{
  "agentId": "websurfer-001",
  "name": "WebSurfer Agent",
  "version": "1.0.0",
  "description": "专业的浏览器操作助手，使用视觉模型分析页面并执行操作",
  "capabilities": [
    {
      "type": "browser_operation",
      "actions": ["click", "input", "scroll", "screenshot", "navigate"],
      "inputTypes": ["text", "image", "coordinates"],
      "outputTypes": ["text", "image", "status"]
    }
  ],
  "authentication": {
    "type": "none",
    "required": false
  },
  "endpoints": {
    "task": "http://localhost:8080/a2a/task",
    "status": "http://localhost:8080/a2a/status",
    "result": "http://localhost:8080/a2a/result"
  },
  "metadata": {
    "llm": "microsoft/Fara-7B",
    "provider": "openai",
    "maxConcurrentTasks": 5
  }
}
```

### 2. 标准化接口

A2A 协议支持多种通信方式：

#### JSON-RPC 2.0

```json
{
  "jsonrpc": "2.0",
  "id": "request-123",
  "method": "execute_task",
  "params": {
    "taskId": "task-001",
    "type": "browser_operation",
    "action": "click",
    "params": {
      "x": 100,
      "y": 200
    }
  }
}
```

#### HTTP REST API

```http
POST /a2a/task
Content-Type: application/json

{
  "taskId": "task-001",
  "type": "browser_operation",
  "action": "click",
  "params": {
    "x": 100,
    "y": 200
  }
}
```

#### Server-Sent Events (SSE)

用于实时状态更新和流式结果：

```http
GET /a2a/stream?taskId=task-001
Accept: text/event-stream

event: status
data: {"status": "running", "progress": 50}

event: result
data: {"success": true, "result": {...}}
```

### 3. 任务管理

完整的任务生命周期管理：

```
创建任务 → 分配 Agent → 执行任务 → 更新状态 → 返回结果
```

**任务状态流转**：

```
pending → running → completed
                ↓
             failed
                ↓
            cancelled
```

### 4. 安全机制

#### 身份认证

- **W3C DID**：基于去中心化身份标识
- **API Key**：简单的密钥认证
- **OAuth 2.0**：标准授权流程

#### 通信加密

- **TLS/SSL**：传输层加密
- **端到端加密**：消息内容加密
- **签名验证**：消息完整性验证

## 消息格式

### 任务请求消息

```typescript
interface TaskRequest {
  // 消息头
  jsonrpc: "2.0"
  id: string
  
  // 方法名
  method: "execute_task" | "delegate_task" | "query_status"
  
  // 参数
  params: {
    taskId: string
    type: AgentType
    description: string
    params: Record<string, any>
    priority?: TaskPriority
    dependencies?: string[]
    timeout?: number
  }
}
```

### 任务响应消息

```typescript
interface TaskResponse {
  jsonrpc: "2.0"
  id: string
  
  // 结果
  result?: {
    taskId: string
    status: TaskStatus
    result?: any
    progress?: number
  }
  
  // 错误
  error?: {
    code: number
    message: string
    data?: any
  }
}
```

### 状态更新消息

```typescript
interface StatusUpdate {
  taskId: string
  status: TaskStatus
  progress?: number
  message?: string
  timestamp: number
}
```

## 通信模式

### 1. 同步通信

**请求-响应模式**：

```
Agent A → 发送任务请求 → Agent B
Agent A ← 返回任务结果 ← Agent B
```

**适用场景**：
- 简单任务
- 需要立即返回结果
- 任务执行时间短

### 2. 异步通信

**任务委托模式**：

```
Agent A → 发送任务请求 → Agent B
Agent A ← 返回任务ID ← Agent B
Agent A → 查询任务状态 → Agent B
Agent A ← 返回任务结果 ← Agent B
```

**适用场景**：
- 长时间运行的任务
- 需要状态跟踪
- 任务可能失败需要重试

### 3. 流式通信

**Server-Sent Events**：

```
Agent A → 发送任务请求 → Agent B
Agent A ← 持续接收状态更新 ← Agent B (SSE)
Agent A ← 最终任务结果 ← Agent B
```

**适用场景**：
- 需要实时进度更新
- 长时间运行的任务
- 流式结果输出

## 实现示例

### Agent Card 注册

```typescript
// 注册 Agent Card
const agentCard = {
  agentId: "websurfer-001",
  name: "WebSurfer Agent",
  capabilities: [
    {
      type: "browser_operation",
      actions: ["click", "input", "scroll"]
    }
  ],
  endpoints: {
    task: "http://localhost:8080/a2a/task"
  }
}

// 发布到服务发现系统
await registerAgentCard(agentCard)
```

### 任务委托

```typescript
// Agent A 委托任务给 Agent B
const taskRequest = {
  jsonrpc: "2.0",
  id: "req-001",
  method: "execute_task",
  params: {
    taskId: "task-001",
    type: "websurfer",
    description: "点击页面上的登录按钮",
    params: {
      x: 100,
      y: 200
    }
  }
}

const response = await sendTaskRequest("websurfer-001", taskRequest)
```

### 状态查询

```typescript
// 查询任务状态
const statusRequest = {
  jsonrpc: "2.0",
  id: "req-002",
  method: "query_status",
  params: {
    taskId: "task-001"
  }
}

const status = await sendStatusRequest("websurfer-001", statusRequest)
```

## 与当前系统的集成

### 1. 扩展 Agent 类型

在 `types.ts` 中添加 A2A 相关类型：

```typescript
export interface AgentCard {
  agentId: string
  name: string
  capabilities: Capability[]
  endpoints: Endpoints
  authentication?: Authentication
}

export interface A2AMessage {
  jsonrpc: "2.0"
  id: string
  method: string
  params?: any
  result?: any
  error?: A2AError
}
```

### 2. 实现 A2A 通信层

创建 `A2AProtocol.ts` 实现标准化的 Agent 间通信。

### 3. 集成到 MultiAgentSystem

在 `MultiAgentSystem` 中添加 A2A 协议支持，使 Agent 可以通过标准协议通信。

## 优势

### 1. 标准化

- 统一的通信协议
- 标准化的消息格式
- 跨平台兼容

### 2. 可扩展性

- 易于添加新的 Agent
- 支持动态服务发现
- 灵活的架构设计

### 3. 安全性

- 企业级安全机制
- 身份认证和授权
- 加密通信

### 4. 互操作性

- 跨厂商兼容
- 不同框架支持
- 开放生态

## 参考资源

- **A2A 官方文档**：https://a2acn.com/docs/introduction/
- **A2A 规范**：https://a2acn.com/specification/
- **GitHub 示例**：https://github.com/google/a2a-protocol

## 总结

A2A 协议为多 Agent 系统提供了标准化的通信框架，使得不同来源、不同技术的 Agent 能够无缝协作。通过 Agent Card、标准化接口和完整的任务管理机制，A2A 协议实现了真正的 Agent 互操作性和协作能力。

