# Magentic-UI 风格的 ReAct 模式实现

## 概述

参考 Microsoft Magentic-UI 项目的 fara-7b 实现，优化了 ReAct 模式下的消息管理策略。

## 核心改进

### 1. 消息管理策略变更

**之前的方案（滑动窗口）：**

- 只保留系统提示词 + 初始用户消息 + 最近 N 轮对话
- 问题：丢失中间的上下文，AI 可能"忘记"之前的操作

**现在的方案（Magentic-UI 风格）：**

- ✅ **保留所有文本消息**（完整任务上下文）
- ✅ **仅限制图片数量**（默认最多3张）
- ✅ **优先保留最新图片**（最相关的视觉信息）
- ✅ **移除旧图片但保留文本**（不丢失操作记录）

### 2. Token 优化策略

根据 Magentic-UI 的研究：

- 每张图片约消耗 **1105 tokens**
- 文本消息相对消耗很少

因此，限制图片数量是最有效的优化方式。

### 3. 实现细节

#### 新增方法

```typescript
/**
 * 检查消息内容是否包含图片
 */
private _messageHasImage(content: any): boolean

/**
 * 从消息中移除图片，但保留文本内容
 */
private _removeImageFromMessage(message: any): any | null

/**
 * 构建用于模型调用的消息列表（magentic-ui 风格）
 * 策略：保留所有文本消息，仅限制图片数量
 */
private _buildMessagesForModel(
  systemMessage: any | null,
  allMessages: any[],
  maxImages: number = 3
): any[]
```

#### 配置参数

```typescript
// 之前：maxRecentRounds（保留最近几轮对话）
const maxRecentRounds = options.maxRecentRounds ?? 2

// 现在：maxImages（保留最多几张图片）
const maxImages = options.maxImages ?? 3
```

## 使用方式

### 默认使用（推荐）

```typescript
agent.chatStream({ 
  message: "帮我完成某个任务",
  model: "fara-7b",
  useReActMode: true
  // 默认保留最多3张图片
})
```

### 自定义图片数量

```typescript
agent.chatStream({ 
  message: "帮我完成某个任务",
  model: "fara-7b",
  useReActMode: true,
  maxImages: 5  // 保留最多5张图片
})
```

### 禁用图片限制（不推荐）

```typescript
agent.chatStream({ 
  message: "帮我完成某个任务",
  model: "fara-7b",
  useReActMode: true,
  maxImages: 0  // 移除所有图片，仅保留文本
})
```

## 对比分析

| 方面 | 之前方案 | Magentic-UI 方案 | 优势 |
|------|---------|-----------------|------|
| **文本消息** | 滑动窗口（只保留最近N轮） | 保留所有文本消息 | ✅ 完整上下文 |
| **图片消息** | 同样限制 | 仅限制图片数量（3张） | ✅ 精准优化 |
| **任务记忆** | 可能丢失中间步骤 | 记住所有操作 | ✅ 更好的决策 |
| **Token 消耗** | 限制整体轮数 | 只限制图片 | ✅ 更高效 |
| **适用场景** | 简单任务 | 复杂多步骤任务 | ✅ 通用性强 |

## 工作原理

### 消息处理流程

```
输入消息历史：
[
  { role: 'system', content: '系统提示词' },
  { role: 'user', content: '初始任务' },
  { role: 'assistant', content: '思考1...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }, { type: 'image', image: '截图1' }] },
  { role: 'assistant', content: '思考2...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }, { type: 'image', image: '截图2' }] },
  { role: 'assistant', content: '思考3...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }, { type: 'image', image: '截图3' }] },
  { role: 'assistant', content: '思考4...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }, { type: 'image', image: '截图4' }] },
]

↓ 处理后（maxImages=3）：

[
  { role: 'system', content: '系统提示词' },
  { role: 'user', content: '初始任务' },
  { role: 'assistant', content: '思考1...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }] },  // ← 图片被移除，文本保留
  { role: 'assistant', content: '思考2...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }, { type: 'image', image: '截图2' }] },  // ← 保留
  { role: 'assistant', content: '思考3...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }, { type: 'image', image: '截图3' }] },  // ← 保留
  { role: 'assistant', content: '思考4...' },
  { role: 'user', content: [{ type: 'text', text: 'Observation: ...' }, { type: 'image', image: '截图4' }] },  // ← 保留（最新）
]
```

### 关键特性

1. **所有文本都保留**：AI 可以看到完整的操作历史
2. **只保留最新的3张图片**：降低 token 消耗
3. **旧图片的文本描述保留**：不丢失操作记录
4. **从后往前处理**：确保保留最相关的图片

## 测试建议

### 场景1：简单任务（1-2步）

- 预期：正常工作，图片限制不会影响
- 测试：搜索一个网页并提取信息

### 场景2：中等任务（3-5步）

- 预期：保留所有文本上下文，最多3张最新图片
- 测试：填写表单、点击多个链接

### 场景3：复杂任务（>5步）

- 预期：AI 记住所有操作，但只看到最新的视觉信息
- 测试：多页面导航、复杂交互流程

### 场景4：图片密集型任务

- 预期：旧图片被移除，但文本描述保留
- 测试：持续监控页面变化

## 参考资源

- [Magentic-UI GitHub](https://github.com/microsoft/magentic-ui)
- [Fara-7B Web Surfer 实现](https://github.com/microsoft/magentic-ui/blob/main/src/magentic_ui/agents/web_surfer/fara/_fara_web_surfer.py)
- [消息历史管理](https://github.com/microsoft/magentic-ui/blob/main/src/magentic_ui/agents/web_surfer/fara/_fara_web_surfer.py#L129-L180)

## 注意事项

1. **图片格式**：确保图片格式为 `{ type: 'image', image: base64string }`
2. **配置优先级**：`maxImages` 配置会覆盖默认值
3. **向后兼容**：不影响非 ReAct 模式的使用
4. **性能影响**：如果任务很长（>20步），可能需要考虑进一步优化

## 未来改进方向

1. **动态系统提示词**：根据当前屏幕尺寸动态生成（参考 Magentic-UI）
2. **智能总结**：当对话超过一定长度时，自动总结历史
3. **可配置策略**：允许用户选择不同的消息管理策略
4. **Token 计数**：实时监控 token 使用情况

## 版本历史

- **v1.0** (2025-12-18): 初始实现，基于 Magentic-UI 研究
