# 使用 createZhipu 传入图片进行分析

本文档说明如何使用 `createZhipu` 传入图片让 zhipu 的 LLM 帮助分析。

## 功能说明

根据 [AI SDK 文档](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#messages.user-model-message.content.text-part.type)，`UserModelMessage` 的 `content` 字段支持两种格式：

1. **纯文本**：`string` - 传统的文本消息
2. **多模态**：`Array<TextPart | ImagePart>` - 包含文本和图片的消息

## 实现细节

代码已经修改以支持多模态消息：

1. **CustomAgentModelProvider.ts**：修改了 `chatStream` 方法，能够识别和处理多模态消息格式
2. **useTinyRobotChat.ts**：修改了 `handleSendMessage` 方法，支持传入图片数组

## 使用方法

### 方法一：直接调用 handleSendMessage（推荐）

```typescript
import { useTinyRobotChat } from '@opentiny/next-remoter'

// 在组件中使用
const { handleSendMessage } = useTinyRobotChat({
  sessionId,
  agentRoot,
  systemPrompt,
  llmConfig,
  skills: []
})

// 将图片转换为 base64 data URL
function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 发送包含图片的消息
async function sendMessageWithImage(text: string, imageFile: File) {
  const base64Image = await imageToBase64(imageFile)
  
  // 调用 handleSendMessage，传入文本、模板数据和图片数组
  await handleSendMessage(text, undefined, [base64Image])
}

// 发送包含多张图片的消息
async function sendMessageWithMultipleImages(text: string, imageFiles: File[]) {
  const base64Images = await Promise.all(
    imageFiles.map(file => imageToBase64(file))
  )
  
  await handleSendMessage(text, undefined, base64Images)
}
```

### 方法二：使用图片 URL

```typescript
// 如果图片已经在服务器上，可以直接使用 URL
const imageUrl = 'https://example.com/image.png'

await handleSendMessage('请分析这张图片', undefined, [imageUrl])
```

### 方法三：扩展 handleSendMessageCustom

如果需要在前端组件中支持图片上传，可以扩展 `handleSendMessageCustom` 方法：

```typescript
// 在 tiny-robot-chat.vue 中
const handleSendMessageCustom = async (
  inputValue: string, 
  templateDataParam?: any[],
  images?: string[] // 新增图片参数
) => {
  const input = inputMessage.value
  if (/^\/[A-Za-z0-9-]{6,}$/.test(input)) {
    // ... 处理 sessionId 的逻辑
  } else {
    const savedTemplateData = templateDataParam
      ? [...templateDataParam]
      : templateData.value.length > 0
        ? [...templateData.value]
        : undefined
    
    // 传递图片参数
    const success = await handleSendMessage(inputValue, templateDataParam, images)

    if (!success && savedTemplateData) {
      nextTick(() => {
        templateData.value = savedTemplateData
      })
    }
  }
}
```

## 消息格式

多模态消息的内部格式如下：

```typescript
{
  role: 'user',
  content: [
    { type: 'text', text: '请分析这张图片' },
    { type: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANS...' }
  ]
}
```

## 支持的图片格式

根据 AI SDK 文档，`ImagePart` 的 `image` 字段支持以下格式：

- **Base64 编码的字符串**：`'iVBORw0KGgoAAAANS...'`
- **Base64 Data URL**：`'data:image/png;base64,iVBORw0KGgoAAAANS...'`（推荐）
- **HTTP(S) URL**：`'https://example.com/image.png'`
- **Uint8Array**、**Buffer**、**ArrayBuffer**：二进制数据

## 注意事项

1. **模型选择**：确保使用的 zhipu 模型支持视觉功能（如 `glm-4v` 或 `glm-4-flash`）
2. **图片大小**：注意图片大小限制，建议压缩大图片
3. **Base64 格式**：推荐使用 `data:image/png;base64,xxx` 格式，包含媒体类型信息
4. **向后兼容**：如果不传入图片参数，功能与之前完全一致，保持向后兼容

## 完整示例

```vue
<template>
  <div>
    <input type="file" @change="handleFileSelect" accept="image/*" />
    <button @click="sendImageMessage">发送图片消息</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTinyRobotChat } from '@opentiny/next-remoter'

const selectedFile = ref<File | null>(null)

const { handleSendMessage } = useTinyRobotChat({
  sessionId: ref('your-session-id'),
  agentRoot: ref('https://agent.opentiny.design/api/v1/webmcp-trial/'),
  systemPrompt: '你是一个图片分析助手',
  llmConfig: {
    apiKey: import.meta.env.VITE_LLM_API_KEY,
    baseURL: import.meta.env.VITE_LLM_BASE_URL,
    providerType: createZhipu,
    model: import.meta.env.VITE_LLM_MODEL
  }
})

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  }
}

async function sendImageMessage() {
  if (!selectedFile.value) {
    alert('请先选择图片')
    return
  }

  // 转换为 base64
  const reader = new FileReader()
  reader.onload = async () => {
    const base64Image = reader.result as string
    await handleSendMessage('请分析这张图片', undefined, [base64Image])
  }
  reader.readAsDataURL(selectedFile.value)
}
</script>
```

## 参考文档

- [AI SDK streamText 文档](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#messages.user-model-message.content.text-part.type)
- [zhipu-ai-provider 文档](https://github.com/zhipuai/zhipu-ai-provider)
