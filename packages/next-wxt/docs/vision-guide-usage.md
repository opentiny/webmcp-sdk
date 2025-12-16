# 视觉引导自动化使用指南

本文档说明如何使用基于屏幕截图的视觉引导自动化功能，让 zhipu 的视觉模型根据截图信息指导 puppeteer 执行操作。

## 功能概述

视觉引导自动化流程：

1. **截取页面截图**：使用 puppeteer 截取当前页面截图（base64 格式）
2. **发送给 zhipu 视觉模型**：将截图和文本提示一起发送给 zhipu 的视觉模型
3. **获取操作指令**：zhipu 根据截图分析页面，给出需要操作的页面元素位置和操作指令
4. **执行操作**：使用 puppeteer 执行操作（点击、输入等）
5. **循环反馈**：操作完成后再次截取截图，发送给 zhipu，继续后续操作

## 核心功能

### 1. 截图工具（takeScreenshot）

在 `extraTools.ts` 中已添加 `takeScreenshot` 工具，可以截取页面截图：

```typescript
// 工具会自动注册到 MCP Server
// 调用方式：通过 AI Agent 调用工具
```

**工具参数**：
- `tabId`（可选）：目标标签页 ID，不提供则使用当前活动标签页
- `fullPage`（可选）：是否截取整个页面（包括滚动区域），默认 false
- `type`（可选）：图片类型（'png' | 'jpeg'），默认 'png'
- `quality`（可选）：图片质量（0-100，仅对 jpeg 有效），默认 90

**返回格式**：
- 返回包含截图的多模态消息（文本 + 图片）

### 2. 视觉引导辅助函数

在 `utils/visionGuide.ts` 中提供了辅助函数：

```typescript
import { captureCurrentTabScreenshot, createVisionGuideMessage } from '@/utils/visionGuide'

// 方式一：直接获取截图
const screenshot = await captureCurrentTabScreenshot({
  fullPage: false,
  type: 'png'
})

// 方式二：使用消息构建器
const builder = createVisionGuideMessage()
builder.addText('请分析这张截图，告诉我需要点击哪个按钮')
await builder.addCurrentTabScreenshot({ fullPage: false })
const messageContent = builder.build()
```

## 使用示例

### 示例 1：在 App.vue 中添加视觉引导按钮

```vue
<template>
  <div class="sidepanel-wrapper">
    <TinyRemoter
      ref="remoterRef"
      :llmConfig="llmConfig"
      <!-- ... 其他属性 ... -->
    >
      <template #header-actions>
        <!-- 视觉引导按钮 -->
        <button 
          class="vision-guide-button" 
          type="button" 
          @click="handleVisionGuide"
        >
          📸 视觉引导
        </button>
      </template>
    </TinyRemoter>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { captureCurrentTabScreenshot } from '@/utils/visionGuide'

const remoterRef = ref<InstanceType<typeof TinyRemoter>>()

// 视觉引导处理函数
async function handleVisionGuide() {
  try {
    // 截取当前页面截图
    const screenshot = await captureCurrentTabScreenshot({
      fullPage: false,
      type: 'png'
    })

    // 构建多模态消息
    const messageContent = [
      {
        type: 'text',
        text: '请分析当前页面截图，告诉我需要执行什么操作。你可以使用 takeScreenshot、click、fill 等工具来完成操作。'
      },
      {
        type: 'image',
        image: screenshot
      }
    ]

    // 发送消息
    const { handleSendMessage } = remoterRef.value
    await handleSendMessage('', undefined, [screenshot])
  } catch (error) {
    console.error('视觉引导失败:', error)
    showToast('视觉引导失败，请重试')
  }
}
</script>
```

### 示例 2：自动循环视觉引导

```typescript
import { captureCurrentTabScreenshot } from '@/utils/visionGuide'

/**
 * 视觉引导自动化流程
 * @param initialPrompt 初始提示词
 * @param maxSteps 最大步骤数（防止无限循环）
 */
async function visionGuideAutomation(
  initialPrompt: string,
  maxSteps: number = 10
) {
  const { handleSendMessage } = remoterRef.value
  let stepCount = 0

  while (stepCount < maxSteps) {
    try {
      // 1. 截取当前页面截图
      const screenshot = await captureCurrentTabScreenshot({
        fullPage: false,
        type: 'png'
      })

      // 2. 构建消息
      const prompt = stepCount === 0 
        ? initialPrompt 
        : '请继续分析当前页面状态，告诉我下一步操作。'

      // 3. 发送消息（包含截图）
      await handleSendMessage(prompt, undefined, [screenshot])

      // 4. 等待 AI 响应和工具执行
      // 注意：这里需要等待 AI 完成响应和工具执行
      // 可以通过监听消息状态来实现

      stepCount++
      
      // 5. 检查是否完成任务（可以通过 AI 响应判断）
      // 如果 AI 返回"任务完成"或类似消息，可以退出循环
      
    } catch (error) {
      console.error(`步骤 ${stepCount} 失败:`, error)
      break
    }
  }
}

// 使用示例
visionGuideAutomation('请帮我完成登录操作', 10)
```

### 示例 3：结合现有工具使用

视觉引导功能可以与现有的工具（如 `takeSnapshot`、`click`、`fill` 等）结合使用：

```typescript
// AI Agent 可以这样工作：
// 1. 调用 takeScreenshot 获取截图
// 2. 分析截图，识别需要操作的元素
// 3. 调用 takeSnapshot 获取无障碍树快照
// 4. 根据截图和快照，找到对应的 UID
// 5. 调用 click 或 fill 执行操作
// 6. 再次调用 takeScreenshot 查看操作结果
// 7. 重复步骤 2-6，直到任务完成
```

## 工作流程

### 标准视觉引导流程

```
用户输入任务
    ↓
截取页面截图（takeScreenshot）
    ↓
发送给 zhipu 视觉模型（包含截图和提示）
    ↓
zhipu 分析截图，给出操作建议
    ↓
AI Agent 调用工具执行操作（click、fill 等）
    ↓
操作完成后截取新截图
    ↓
发送给 zhipu 确认结果
    ↓
继续下一步操作或完成任务
```

### 与无障碍树结合使用

```
截取页面截图
    ↓
获取无障碍树快照（takeSnapshot）
    ↓
zhipu 根据截图和快照，找到需要操作的元素 UID
    ↓
执行操作（click、fill 等）
    ↓
获取操作后的快照和截图
    ↓
继续下一步
```

## 注意事项

1. **模型选择**：确保使用支持视觉的 zhipu 模型（如 `glm-4v` 或 `glm-4-flash`）
2. **截图大小**：大页面截图可能很大，建议使用 `fullPage: false` 仅截取可见区域
3. **循环控制**：设置合理的最大步骤数，防止无限循环
4. **错误处理**：截图或操作失败时要有适当的错误处理
5. **性能考虑**：频繁截图可能影响性能，建议在操作之间添加适当延迟

## 工具列表

视觉引导相关的工具：

- **takeScreenshot**：截取页面截图（返回 base64 格式）
- **takeSnapshot**：获取无障碍树快照（包含 UID）
- **click**：点击页面元素（通过 UID）
- **fill**：在输入框中输入文本（通过 UID）
- **selectOption**：在下拉框中选择选项（通过 UID）

## 参考

- [AI SDK 多模态消息文档](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#messages.user-model-message.content.text-part.type)
- [图片视觉分析使用指南](../next-remoter/docs/image-vision-usage.md)

