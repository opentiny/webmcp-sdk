# OpenTiny Next Remoter

一个基于 `@opentiny/tiny-robot` 开发的 Vue3 AI 对话组件，提供开箱即用的智能对话能力。

## ✨ 主要功能

- 🤖 **AI 对话**：支持与大语言模型进行智能对话
- 🎨 **自定义界面**：支持自定义欢迎界面和提示建议
- 🔌 **MCP 插件市场**：内置插件市场，支持添加和管理 MCP 服务
- 📱 **扫码添加应用**：支持扫码快速添加应用和工具
- 🔄 **多模型切换**：支持在多个大语言模型之间切换
- 🎯 **技能系统**：支持自定义技能和提示词
- 🎭 **多角色展示**：支持多角色消息展示，支持 Markdown 和工具调用渲染
- 🎪 **生成式 UI**：支持生成式 UI 渲染（可选）
- 🌐 **国际化支持**：支持中英文切换

## 📦 安装

```bash
npm install @opentiny/next-remoter
# 或
pnpm add @opentiny/next-remoter
```

## 🏗️ 项目结构

```
next-remoter/
├── src/
│   ├── components/        # 组件实现
│   │   ├── TinyRobotChat.vue  # 核心对话组件
│   │   └── QrCodeScan.vue     # 二维码扫码组件
│   ├── composable/        # 组合式函数
│   │   └── usePlugin.ts       # 插件管理逻辑
│   ├── index.ts          # 导出 Vue 组件，供用户使用
│   └── App.vue           # 部署在服务器上的扫码访问页面
├── package.json
└── README.md
```

**说明：**

- `index.ts`：导出 `TinyRemoter` 组件供外部使用
- `App.vue`：可部署到服务器，提供扫码访问的独立页面
- `components/TinyRobotChat.vue`：核心对话组件实现
- `composable/usePlugin.ts`：MCP 插件管理的核心逻辑

## 🚀 快速开始

### 基本使用

```vue
<template>
  <TinyRemoter 
    v-model:show="showAiChat" 
    :sessionId="sessionId" 
    title="我的AI助手"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const showAiChat = ref(false)
const sessionId = ref('your-session-id')
</script>
```

### 完整使用示例

```vue
<template>
  <TinyRemoter 
    ref="remoterRef" 
    v-model:show="showAiChat" 
    :sessionId="sessionId" 
    :title="项目名称"
    :llmConfig="llmConfig"
    :customMarketMcpServers="customMarketMcpServers"
  >
    <!-- 自定义欢迎界面 -->
    <template #welcome>
      <div class="welcome-content">
        <h2>欢迎使用 AI 助手</h2>
        <p>我可以帮您完成各种任务</p>
        <button @click="sendPrompt('帮我分析数据')">分析数据</button>
      </div>
    </template>
    
    <!-- 自定义输入框上方的提示建议 -->
    <template #suggestions>
      <div class="suggestions">
        <button @click="sendPrompt('查询天气')">查询天气</button>
        <button @click="sendPrompt('生成代码')">生成代码</button>
      </div>
    </template>
  </TinyRemoter>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const showAiChat = ref(false)
const remoterRef = ref()
const sessionId = ref('your-session-id')

// 配置自定义 LLM
const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

// 自定义 MCP 服务器
const customMarketMcpServers = [
  {
    id: 'custom-server',
    name: '自定义服务器',
    description: '我的自定义 MCP 服务',
    url: 'https://your-server.com/mcp',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  }
]

// 发送预设提示词
const sendPrompt = (message) => {
  remoterRef.value?.sendMessage(message)
}
</script>
```

## 📖 使用场景

### 场景一：创建 WebMCP 连接

```typescript
import { WebMcpClient, WebMcpServer, createMessageChannelPairTransport } from '@opentiny/next-sdk'

// 1. 创建消息通道
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 2. 创建并连接 MCP 服务端
const server = new WebMcpServer({ name: 'demo-server', version: '1.0.0' })
await server.connect(serverTransport)

// 3. 创建并连接 MCP 客户端
const client = new WebMcpClient({ name: 'demo-client', version: '1.0.0' })
await client.connect(clientTransport)

// 4. 连接到远程 MCP 服务
const { sessionId } = await client.connect({
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp',
  agent: true
})
```

### 场景二：创建页面浮动遥控器

```typescript
import { createRemoter } from '@opentiny/next-sdk'

// 创建页面右下角的浮动遥控器
createRemoter({
  sessionId,
  qrCodeUrl: 'https://ai.opentiny.design/next-remoter',
  onShowAIChat: () => {
    showAiChat.value = true
  }
})
```

## ⚙️ 组件属性

### 基础属性

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `v-model:show` | `boolean` | 是 | - | 双向绑定是否显示对话框 |
| `sessionId` | `string` | 是 | - | 会话 ID |
| `title` | `string` | 否 | - | 对话框左上角标题 |
| `v-model:fullscreen` | `boolean` | 否 | `false` | 双向绑定是否全屏 |
| `agentRoot` | `string` | 否 | - | 后端代理地址 |
| `locale` | `'zh-CN' \| 'en-US'` | 否 | `'zh-CN'` | 国际化语言 |
| `mode` | `'remoter' \| 'chat-dialog'` | 否 | `'chat-dialog'` | 展示模式 |
| `systemPrompt` | `string` | 否 | - | 系统提示词 |
| `llmConfig` | `object` | 否 | - | 大语言模型配置 |
| `llmConfigs` | `array` | 否 | - | 多模型配置数组 |
| `v-model:selectedModelId` | `string` | 否 | - | 当前选中的模型 ID |
| `customMarketMcpServers` | `array` | 否 | - | 自定义 MCP 市场服务列表 |
| `skills` | `array` | 否 | - | 技能配置数组 |
| `inBrowserExt` | `boolean` | 否 | `false` | 是否运行在浏览器扩展中 |
| `genUiAble` | `boolean` | 否 | `false` | 是否支持生成式 UI |
| `genUiComponents` | `object` | 否 | - | 生成式 UI 组件 |

### LLM 配置（llmConfig）

TinyRemoter 组件支持自定义大语言模型配置，统一通过 `llmConfig` 传入：

#### 方式一：使用 providerType 配置

```typescript
const llmConfig = {
  apiKey: 'your-api-key',
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai', // 支持 'openai' | 'deepseek'
  model: 'gpt-4o',
  maxSteps: 10
}
```

#### 方式二：使用自定义 Provider 实例

```typescript
import { createOpenAI } from '@ai-sdk/openai'

const llmConfig = {
  llm: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1'
  }),
  model: 'gpt-4o'
}
```

#### 支持的 LLM 提供商

- ✅ OpenAI (`providerType: 'openai'`)
- ✅ DeepSeek (`providerType: 'deepseek'`)
- ✅ Anthropic Claude（通过自定义 Provider）
- ✅ 其他 ai-sdk 兼容的提供商

### 插槽

| 插槽名 | 说明 |
|--------|------|
| `#welcome` | 无对话消息时展示的欢迎界面，可自定义标题、图标、预设提示词等 |
| `#suggestions` | 输入框上方的提示建议区域 |
| `#operations` | 容器头部右侧的操作区域（新建会话、历史会话等） |
| `#header-actions` | MCP 插件市场头部的操作区域 |

### 导出方法和属性

```typescript
defineExpose({
  agent,              // 大模型代理实例
  welcomeIcon,        // 欢迎图标
  messages,           // 对话消息列表
  messageState,       // 对话消息状态
  roles,              // 对话角色配置
  inputMessage,       // 输入框文本
  senderRef,          // 输入框组件实例
  abortRequest,       // 取消发送函数
  sendMessage,        // 发送消息函数
  loadMcpServerToPlugin,     // 加载 MCP 服务到插件
  handleClientDisconnected,  // 处理客户端断开
  addMessage          // 添加消息函数
})
```

## 💡 使用示例

### 示例 1：使用 OpenAI

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    :sessionId="sessionId"
    title="OpenAI 助手"
    :llmConfig="openAIConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)
const sessionId = ref('session-001')

const openAIConfig = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o',
  maxSteps: 10
}
</script>
```

### 示例 2：使用 DeepSeek

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    :sessionId="sessionId"
    title="DeepSeek 助手"
    :llmConfig="deepSeekConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)
const sessionId = ref('session-002')

const deepSeekConfig = {
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
  providerType: 'deepseek',
  model: 'deepseek-chat',
  maxSteps: 30
}
</script>
```

### 示例 3：使用 Anthropic Claude

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    :sessionId="sessionId"
    title="Claude 助手"
    :llmConfig="claudeConfig"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createAnthropic } from '@ai-sdk/anthropic'

const show = ref(false)
const sessionId = ref('session-003')

const claudeConfig = {
  llm: createAnthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY
  }),
  model: 'claude-3-5-sonnet-20241022'
}
</script>
```

### 示例 4：多模型切换

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    v-model:selected-model-id="selectedModelId"
    :sessionId="sessionId"
    title="智能助手"
    :llmConfigs="modelConfigs"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import IconOpenAI from './icons/openai.svg'
import IconDeepSeek from './icons/deepseek.svg'

const show = ref(false)
const sessionId = ref('session-004')
const selectedModelId = ref('gpt-4o')

const modelConfigs = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    icon: IconOpenAI,
    isDefault: true,
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
    providerType: 'openai',
    model: 'gpt-4o'
  },
  {
    id: 'deepseek-v3',
    label: 'DeepSeek V3',
    icon: IconDeepSeek,
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com',
    providerType: 'deepseek',
    model: 'deepseek-chat'
  }
]

// 监听模型切换
watch(selectedModelId, (newModelId) => {
  console.log('当前选中的模型:', newModelId)
})
</script>
```

### 示例 5：配置技能列表

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    :sessionId="sessionId"
    title="技能助手"
    :llmConfig="llmConfig"
    :skills="skills"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)
const sessionId = ref('session-005')

const llmConfig = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

// 在输入框输入 @ 可唤起技能列表
const skills = [
  {
    label: '办公助手',
    value: '你是一个办公助手，擅长处理文档、邮件和日程安排'
  },
  {
    label: '代码专家',
    value: '你是一个代码专家，擅长编写和优化代码',
    tools: ['codeAnalysis', 'codeGeneration']
  },
  {
    label: '数据分析师',
    value: '你是一个数据分析师，擅长数据分析和可视化'
  }
]
</script>
```

### 示例 6：自定义插槽

```vue
<template>
  <TinyRemoter
    ref="robotRef"
    v-model:show="show"
    :sessionId="sessionId"
    title="自定义助手"
    :llmConfig="llmConfig"
  >
    <!-- 自定义欢迎界面 -->
    <template #welcome>
      <div class="custom-welcome">
        <img src="./logo.png" alt="Logo" />
        <h2>欢迎使用智能助手</h2>
        <p>选择一个快速开始的功能</p>
        <div class="quick-actions">
          <button 
            v-for="action in quickActions" 
            :key="action.id"
            @click="handleQuickAction(action)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </template>

    <!-- 自定义提示建议 -->
    <template #suggestions>
      <div class="suggestion-pills">
        <span 
          v-for="suggestion in suggestions"
          :key="suggestion"
          @click="handleSuggestion(suggestion)"
        >
          {{ suggestion }}
        </span>
      </div>
    </template>

    <!-- 自定义头部操作 -->
    <template #operations>
      <button @click="exportChat">导出对话</button>
      <button @click="clearHistory">清空历史</button>
    </template>
  </TinyRemoter>
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)
const robotRef = ref()
const sessionId = ref('session-006')

const llmConfig = {
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
  providerType: 'openai',
  model: 'gpt-4o'
}

const quickActions = [
  { id: 1, label: '📊 数据分析', prompt: '帮我分析这份数据' },
  { id: 2, label: '💻 代码生成', prompt: '帮我生成代码' },
  { id: 3, label: '📝 文档撰写', prompt: '帮我撰写文档' }
]

const suggestions = ['天气查询', '日程安排', '邮件撰写', '数据可视化']

const handleQuickAction = (action) => {
  robotRef.value?.sendMessage(action.prompt)
}

const handleSuggestion = (suggestion) => {
  robotRef.value?.sendMessage(suggestion)
}

const exportChat = () => {
  const messages = robotRef.value?.messages
  console.log('导出对话:', messages)
}

const clearHistory = () => {
  console.log('清空历史')
}
</script>

<style scoped>
.custom-welcome {
  text-align: center;
  padding: 40px 20px;
}

.quick-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.suggestion-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px;
}

.suggestion-pills span {
  padding: 6px 12px;
  background: #f0f0f0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-pills span:hover {
  background: #e0e0e0;
}
</style>
```

## 🔌 自定义 MCP 插件

`TinyRemoter` 通过 `customMarketMcpServers` 属性支持自定义 MCP 插件。传入的插件会与组件内置的 `DEFAULT_SERVERS` 合并，显示在插件市场中。

### 插件配置说明

```typescript
interface PluginInfo {
  id: string              // 插件唯一标识（最终会拼成 plugin-${id}）
  name: string            // 插件名称
  description: string     // 插件描述
  icon?: string           // 插件图标 URL
  url: string             // MCP 服务器地址
  type: 'sse' | 'StreamableHTTP'  // 协议类型
  enabled: boolean        // 是否已启用
  addState: 'idle' | 'adding' | 'added' | 'error'  // 添加状态
  tools: any[]            // 工具列表
}
```

### 使用示例

```vue
<template>
  <TinyRemoter
    v-model:show="show"
    :sessionId="sessionId"
    :customMarketMcpServers="customServers"
  />
</template>

<script setup>
import { ref } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'

const show = ref(false)
const sessionId = ref('session-007')

const customServers = [
  {
    id: 'ppt-mcp',
    name: 'PPT 文档服务',
    description: '可以创建、编辑、保存 PPT 文档',
    icon: 'https://example.com/icons/ppt.png',
    url: 'https://your-server.com/servers/ppt-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  },
  {
    id: 'excel-mcp',
    name: 'Excel 数据处理',
    description: '支持 Excel 文件读取、分析和生成',
    icon: 'https://example.com/icons/excel.png',
    url: 'https://your-server.com/servers/excel-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  },
  {
    id: 'database-mcp',
    name: '数据库查询',
    description: '支持多种数据库的查询操作',
    url: 'https://your-server.com/servers/db-mcp',
    type: 'StreamableHTTP',
    enabled: false,
    addState: 'idle',
    tools: []
  }
]
</script>
```

### 字段说明

- **id**：插件唯一标识，需保持全局唯一性
- **type**：需与后端 MCP 服务器协议类型保持一致（`sse` 或 `StreamableHTTP`）
- **enabled**：标记插件是否已启用，用于 UI 状态显示
- **addState**：插件添加状态，驱动 UI 按钮和进度显示
  - `idle`：未添加
  - `adding`：添加中
  - `added`：已添加
  - `error`：添加失败
- **tools**：MCP 服务提供的工具列表，连接成功后自动填充

### 在浏览器扩展中使用

在浏览器扩展场景中，可以通过配置文件自动聚合自定义插件：

```typescript
// packages/next-wxt/entrypoints/sidepanel/useCustomMarketMcpServers.ts
import { customServers } from './meta'

const customMarketMcpServers = useCustomMarketMcpServers(customServers)
```

## 🛠️ 参与开发

### 环境要求

- **Node.js** >= 18
- **pnpm** >= 8
- **Vue** 3.x

### 开发流程

#### 1. 克隆项目

```bash
git clone https://github.com/opentiny/next-sdk.git
cd next-sdk
```

#### 2. 安装依赖

```bash
pnpm install
```

#### 3. 开发模式

```bash
# 进入 next-remoter 包目录
cd packages/next-remoter

# 启动开发服务器
pnpm dev

# 浏览器访问 http://localhost:5173
```

#### 4. 构建项目

```bash
# 构建生产版本
pnpm build

# 构建运行时版本
pnpm build:runtime

# 构建站点版本
pnpm build:site
```

### 项目结构详解

```
packages/next-remoter/
├── src/
│   ├── components/              # 组件目录
│   │   ├── TinyRobotChat.vue   # 核心对话组件（689 行）
│   │   └── QrCodeScan.vue      # 二维码扫描组件
│   ├── composable/              # 组合式函数
│   │   └── usePlugin.ts        # 插件管理逻辑（418 行）
│   ├── index.ts                 # 组件导出入口
│   └── App.vue                  # 独立部署页面
├── vite.config.ts               # Vite 配置
├── vite.runtime.config.ts       # 运行时构建配置
├── vite.remoter.config.ts       # Remoter 构建配置
├── package.json                 # 包配置
└── README.md                    # 本文档
```

### 核心文件说明

#### TinyRobotChat.vue

- 核心对话组件实现
- 包含消息展示、输入处理、工具调用等核心功能
- 支持插槽自定义和主题配置

#### usePlugin.ts

- MCP 插件管理的核心逻辑
- 处理插件的添加、删除、启用/禁用
- 管理工具列表和调用

#### index.ts

- 导出 `TinyRemoter` 组件
- 作为 npm 包的入口文件

#### App.vue

- 可独立部署的扫码访问页面
- 用于移动端或独立部署场景

### 构建脚本说明

```json
{
  "scripts": {
    "dev": "vite",                              // 开发服务器
    "build": "vite build",                      // 构建 npm 包
    "build:runtime": "vite build --config vite.runtime.config.ts",  // 构建运行时
    "build:site": "vite build --config vite.remoter.config.ts",     // 构建站点
    "build:visualizer": "vite build --config vite.remoter.config.ts --mode visualizer", // 构建分析
    "preview": "vite preview"                   // 预览构建结果
  }
}
```

### 发布流程

```bash
# 1. 更新版本号
# 编辑 packages/next-remoter/package.json 中的 version 字段

# 2. 安装依赖（如果还没安装）
pnpm install

# 3. 构建项目
pnpm -F @opentiny/next-remoter build

# 4. 进入包目录
cd packages/next-remoter

# 5. 发布到 npm（需要 npm 登录）
npm publish
```

### 调试技巧

#### 1. 使用开发工具

```bash
# 启动开发服务器，支持热重载
pnpm dev
```

#### 2. 查看构建产物

```bash
# 使用 visualizer 模式查看打包分析
pnpm build:visualizer
```

#### 3. 本地测试 npm 包

```bash
# 在 next-remoter 目录下创建本地链接
pnpm link

# 在测试项目中使用
cd /path/to/test-project
pnpm link @opentiny/next-remoter
```

### 贡献指南

我们欢迎所有形式的贡献！以下是参与贡献的方式：

#### 报告问题

- 在 [GitHub Issues](https://github.com/opentiny/next-sdk/issues) 提交 Bug 报告
- 提供详细的复现步骤和环境信息

#### 提交代码

1. Fork 项目到你的 GitHub 账号
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交改动：`git commit -m 'Add some amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

#### 代码规范

- 遵循 Vue3 组合式 API 最佳实践
- 使用 TypeScript 编写类型安全的代码
- 添加必要的注释和文档
- 确保代码通过 ESLint 检查

## 📚 文档和资源

- [官方文档](https://docs.opentiny.design/next-sdk/guide/tiny-robot-remoter.html)
- [GitHub 仓库](https://github.com/opentiny/next-sdk)
- [问题反馈](https://github.com/opentiny/next-sdk/issues)
- [OpenTiny 官网](https://opentiny.design)

## ❓ 常见问题

### 1. 如何获取 sessionId？

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient({ name: 'my-client', version: '1.0.0' })
const { sessionId } = await client.connect({
  url: 'https://your-mcp-server.com/mcp',
  agent: true
})
```

### 2. 如何切换大语言模型？

使用 `llmConfigs` 属性配置多个模型，通过 `v-model:selectedModelId` 切换：

```vue
<TinyRemoter
  v-model:selected-model-id="modelId"
  :llmConfigs="models"
/>
```

### 3. 如何自定义欢迎界面？

使用 `#welcome` 插槽：

```vue
<TinyRemoter>
  <template #welcome>
    <div>自定义内容</div>
  </template>
</TinyRemoter>
```

### 4. 如何调用组件方法？

通过 ref 引用组件实例：

```vue
<script setup>
const robotRef = ref()
// 发送消息
robotRef.value?.sendMessage('你好')
// 取消请求
robotRef.value?.abortRequest()
</script>
```

## 📄 许可证

MIT

## 🙏 致谢

感谢所有为本项目做出贡献的开发者！

---

如有任何问题或建议，欢迎提交 [Issue](https://github.com/opentiny/next-sdk/issues) 或 [Pull Request](https://github.com/opentiny/next-sdk/pulls)。
