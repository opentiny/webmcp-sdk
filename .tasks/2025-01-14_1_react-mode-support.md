# Context

File name: 2025-01-14_1_react-mode-support.md
Created at: 2025-01-14
Created by: AI Assistant
Main branch: main
Task Branch: task/react-mode-support_2025-01-14_1
Yolo Mode: Off

# Task Description

根据 PR 73 的总体规划，基于现有逻辑扩展不支持 function call 的大模型，通过 ReAct 提示词的方式支持工具调用，通过添加配置实现，不影响现有的逻辑。

# Project Overview

- 当前系统使用 ai-sdk 的 `streamText` 和 `generateText` 进行工具调用
- `AgentModelProvider` 类负责管理 LLM 和工具调用
- 需要扩展支持不支持 function call 的模型，使用 ReAct 模式

⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️
[核心 RIPER-5 协议规则：必须声明模式、不能跨模式操作、EXECUTE 模式必须严格按照计划执行]
⚠️ WARNING: NEVER MODIFY THIS SECTION ⚠️

# Analysis

## 代码结构分析

1. **AgentModelProvider** (`packages/next-sdk/agent/AgentModelProvider.ts`)
   - 当前使用 ai-sdk 的 function calling 机制
   - `_chat` 方法处理对话和工具调用
   - `_tempMergeTools` 方法合并工具列表

2. **类型定义** (`packages/next-sdk/agent/type.ts`)
   - `IAgentModelProviderLlmConfig` 定义 LLM 配置
   - 需要添加 `useReActMode` 配置项

3. **工具获取** (`packages/next-sdk/agent/utils/getAISDKTools.ts`)
   - 从 MCP Client 获取工具列表
   - 转换为 ai-sdk 的 ToolSet 格式

## ReAct 模式实现要点

1. 在系统提示词中添加工具描述
2. 解析模型输出，提取工具调用意图（Action/Action Input）
3. 执行工具调用
4. 将结果添加到对话历史
5. 继续对话循环

# Proposed Solution

1. 在 `IAgentModelProviderLlmConfig` 中添加可选的 `useReActMode` 配置项
2. 在 `AgentModelProvider` 中添加 ReAct 模式的实现方法
3. 修改 `_chat` 方法，根据配置选择使用 function call 还是 ReAct 模式
4. 实现 ReAct 提示词生成、工具调用解析和执行逻辑

# Current execution step: "3. 实施阶段完成"

# Implementation Plan

## 1. 扩展类型定义 (`packages/next-sdk/agent/type.ts`)

- 在 `LlmFactoryConfig` 和 `LlmInstanceConfig` 中添加可选的 `useReActMode?: boolean` 字段
- 确保类型兼容性，不影响现有代码

## 2. 创建 ReAct 工具描述生成函数 (`packages/next-sdk/agent/utils/generateReActPrompt.ts`)

- 函数名：`generateReActToolsPrompt`
- 输入：工具集合 (ToolSet)
- 输出：格式化的工具描述字符串
- 格式：ReAct 风格的提示词，包含工具名称、描述、参数说明

## 3. 创建 ReAct 工具调用解析函数 (`packages/next-sdk/agent/utils/parseReActAction.ts`)

- 函数名：`parseReActAction`
- 输入：模型输出的文本
- 输出：解析出的工具调用信息 `{ toolName: string, arguments: any } | null`
- 支持多种格式：`Action: tool_name\nAction Input: {...}` 或 JSON 格式

## 4. 扩展 AgentModelProvider 类 (`packages/next-sdk/agent/AgentModelProvider.ts`)

- 添加私有属性 `useReActMode: boolean` 存储配置
- 在构造函数中读取 `llmConfig.useReActMode` 配置
- 添加私有方法 `_generateReActSystemPrompt`：生成包含工具描述的 ReAct 系统提示词
- 添加私有方法 `_executeReActToolCall`：执行 ReAct 模式下的工具调用
- 添加私有方法 `_chatReAct`：ReAct 模式的对话实现
- 修改 `_chat` 方法：根据 `useReActMode` 选择使用原有逻辑或 ReAct 逻辑

## 5. ReAct 模式实现细节

- 系统提示词格式：包含工具列表和调用格式说明
- 工具调用格式：`Action: <tool_name>\nAction Input: <json_args>`
- 循环逻辑：解析输出 -> 执行工具 -> 添加结果到消息 -> 继续对话
- 最大步数控制：使用 `maxSteps` 限制循环次数
- 流式输出支持：适配 `streamText` 的流式输出格式

## 6. 错误处理

- 工具调用解析失败时的处理
- 工具执行失败时的错误信息返回
- 保持与原有错误处理机制一致

## 实现清单 (Implementation Checklist)

### 步骤 1: 扩展类型定义

1. 修改 `packages/next-sdk/agent/type.ts`
   - 在 `LlmFactoryConfig` 类型中添加 `useReActMode?: boolean`
   - 在 `LlmInstanceConfig` 类型中添加 `useReActMode?: boolean`

### 步骤 2: 创建 ReAct 工具描述生成工具函数

2. 创建 `packages/next-sdk/agent/utils/generateReActPrompt.ts`
   - 实现 `generateReActToolsPrompt(tools: ToolSet): string` 函数
   - 遍历工具集合，生成格式化的工具描述
   - 包含工具名称、描述、参数 schema 说明

### 步骤 3: 创建 ReAct 工具调用解析工具函数

3. 创建 `packages/next-sdk/agent/utils/parseReActAction.ts`
   - 实现 `parseReActAction(text: string, availableTools: ToolSet): { toolName: string; arguments: any } | null` 函数
   - 支持解析 `Action: tool_name\nAction Input: {...}` 格式
   - 支持解析 JSON 格式的工具调用
   - 验证工具名称是否存在于可用工具列表中

### 步骤 4: 扩展 AgentModelProvider 类

4. 修改 `packages/next-sdk/agent/AgentModelProvider.ts`
   - 在类中添加私有属性 `private useReActMode: boolean = false`
   - 在构造函数中读取并设置 `this.useReActMode = (llmConfig as any).useReActMode ?? false`
   - 添加私有方法 `_generateReActSystemPrompt(tools: ToolSet, baseSystemPrompt?: string): string`
   - 添加私有方法 `_executeReActToolCall(toolName: string, args: any, tools: ToolSet): Promise<any>`
   - 添加私有方法 `_chatReAct` 实现 ReAct 模式的对话逻辑
   - 修改 `_chat` 方法，添加模式判断：`if (this.useReActMode) { return this._chatReAct(...) }`

### 步骤 5: 实现 ReAct 对话逻辑

5. 在 `_chatReAct` 方法中实现：
   - 初始化工具列表和系统提示词
   - 循环对话（最多 maxSteps 次）：
     a. 调用 LLM 生成回复
     b. 解析输出中的工具调用
     c. 如果检测到工具调用，执行工具并添加结果到消息历史
     d. 如果没有工具调用，返回最终答案
   - 支持流式输出（streamText）和同步输出（generateText）
   - 保持消息历史管理

### 步骤 6: 测试和验证

6. 确保向后兼容性
   - 默认 `useReActMode` 为 `false`，保持原有行为
   - 只有显式设置 `useReActMode: true` 时才启用 ReAct 模式
   - 验证现有代码不受影响

# Task Progress

[2025-01-14]

- Modified: packages/next-sdk/agent/type.ts
  - 在 LlmFactoryConfig 和 LlmInstanceConfig 类型中添加了 useReActMode?: boolean 字段
- Created: packages/next-sdk/agent/utils/generateReActPrompt.ts
  - 实现了 generateReActToolsPrompt 函数，用于生成 ReAct 格式的工具描述提示词
- Created: packages/next-sdk/agent/utils/parseReActAction.ts
  - 实现了 parseReActAction 函数，用于从模型输出中解析工具调用信息
  - 支持多种格式：标准 ReAct 格式、JSON 格式、代码块格式
- Modified: packages/next-sdk/agent/AgentModelProvider.ts
  - 添加了 useReActMode 私有属性
  - 在构造函数中读取并设置 useReActMode 配置
  - 添加了 _generateReActSystemPrompt 方法：生成包含工具描述的 ReAct 系统提示词
  - 添加了 _executeReActToolCall 方法：执行 ReAct 模式下的工具调用
  - 添加了 _chatReAct 方法：ReAct 模式的主入口
  - 添加了 _chatReActNonStream 方法：非流式 ReAct 对话实现
  - 添加了 _chatReActStream 方法：流式 ReAct 对话实现
  - 修改了 _chat 方法：根据 useReActMode 配置选择使用原有逻辑或 ReAct 逻辑
- Changes: 实现了完整的 ReAct 模式支持，通过配置项控制是否启用，不影响现有逻辑
- Reason: 扩展支持不支持 function call 的大模型，通过 ReAct 提示词方式实现工具调用
- Blockers: 无
- Status: SUCCESSFUL

# Final Review

[待完成]
