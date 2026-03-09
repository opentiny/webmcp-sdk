# 浏览器扩展AI大模型配置指南

## 概述

在浏览器扩展工程 `next-wxt`中，`entrypoints/sidepanel/model-manage` 文件夹负责管理浏览器扩展中AI对话大模型的配置。该系统支持两种部署模式：

- **内网模式**：适用于内网环境，需要身份认证
- **公网模式**： 适用于公网环境，无需特殊认证

## 目录结构

```
model-manage/
├── index.ts              # 配置入口文件，负责模式切换逻辑
├── intranet-model-config.ts # 内网模式模型配置
└── internet-model-config.ts  # 公网模式模型配置
```

## 如何配置大模型

### 1. 配置入口

`index.ts`是整个模型配置系统的入口文件，开发用户一般无须更改。它主要功能包括：

- 配置在编译时,通过环境变量 `VITE_MODEL_CONFIG` 来决定使用哪种模式
- 支持为内网模式自动注入认证Token

通过下面命令，可以分别生成不同环境下的浏览器扩展的文件产物。

```bash
pnpm run build  # 使用外部配置，构建浏览器扩展
pnpm run build:inner # 使用内部配置，构建浏览器扩展
```

### 2. 添加自定义大模型配置

#### 步骤1：准备模型图标

在 `../icons/` 目录下添加您的模型图标文件（推荐SVG格式）：

```typescript
import IconYourModel from '../icons/icon-model-your-model.svg'
```

#### 步骤2：配置模型参数

每个模型配置需要包含以下核心字段：

```typescript
{
  id: 'unique-model-id',           // 唯一标识符
  label: '显示名称',               // 用户界面显示名称
  model: 'actual-model-name',      // 实际模型名称
  apiKey: 'your-api-key',          // API密钥
  baseURL: 'https://api.example.com', // API基础地址
  providerType: 'deepseek',        // 提供商类型  deepseek 或 openai
  useReActMode: boolean,           // 是否启用ReAct模式(仅大模型不支持工具调用时，才需要开启ReAct模式 )
  icon: markRaw(IconComponent),    // 模型图标组件
  isDefault?: boolean,             // 是否为默认模型（可选）

  // 可选字段
  genuiUrl?: string,               // 生成式 UI 服务地址。与 baseURL 同时配置时，输入框旁会显示「生成式 UI」开关
  headers?: Record<string, string>, // 自定义请求头
  multimodal?: {                   // 多模态配置（可选）
    supportImages: boolean,
    maxFileSize: number,           // 最大文件大小，单位： MB
    supportedMimeTypes: string[]
  },
  llm?: any                         // 自定义 llm 。
}
```

> 特别提示： 如果大模型不兼容deepseek或openai协议时，可以设置 `llm` 属性为一个ai-sdk的provider ,请参考 [ai-sdk provider文档](https://ai-sdk.dev/providers/ai-sdk-providers)

### 3. 高级配置选项

### 3-1. 多模态支持

为支持图像等多模态输入的模型配置：

```typescript
{
  id: 'multimodal-model',
  // ... 基础配置
  multimodal: {
    supportImages: true,
    maxFileSize: 10, // 最大文件大小 10MB
    supportedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
}
```

### 3-2. 自定义HTTP头

添加特定的请求头信息：

```typescript
{
  id: 'custom-model',
  // ... 基础配置
  headers: {
    'X-API-Version': 'v2',
    'X-Organization': 'your-org',
    'Custom-Auth': 'bearer token'
  }
}
```

### 3-3. 集成Chrome内置AI

使用Chrome内置AI引擎,可以防止数据外流以及节省费用等优势，启用Chrome内置AI的必要条件有：

- chrome版本号 138+
- 满足`chrome`的硬件要求
- 登录 goolge 账号，符合Google地区要求

详细信息请参考[AI on Chrome](https://developer.chrome.google.cn/docs/ai/prompt-api?hl=zh-cn) 文档

```typescript
import { builtInAI } from '@built-in-ai/core'
import IconModelBuiltInAI from './icons/icon-model-built-in-ai.svg'

{
  id: 'built-in-ai',
  label: '内置AI',
  model: 'built-in-ai',
  llm: builtInAI as unknown as any,
  useReActMode: true,
  icon: markRaw(IconModelBuiltInAI as unknown as Component)
}
```

通过以上配置，您可以灵活地为浏览器扩展添加各种AI大模型支持，满足不同部署环境的需求。

### 3-4. 集成本地Ollama模型

使用本地 `Ollama` 模型,同样具有防止数据外流以及节省费用等优势，用户本机需要安装 `Ollama` 程序并下载大模型文件，下面以 `qwen3:8b` 和 `qwen3-vl:8b` 来演示如何配置本地 `Ollama` 模型

```typescript

import IconModelDeepseek from './icons/icon-model-deepseek.svg'

{
    id: 'qwen3:8b',
    label: 'qwen3:8b',
    model: 'qwen3:8b',
    apiKey: 'sk-trial',
    baseURL: 'http://localhost:11434/api',
    providerType: createOllama,
    useReActMode: false,
    icon: IconModelDeepseek as unknown as Component
  },
  {
    id: 'qwen3-vl:8b',
    label: 'qwen3-vl:8b',
    model: 'qwen3-vl:8b',
    apiKey: 'sk-trial',
    baseURL: 'http://localhost:11434/api',
    providerType: createOllama,
    useReActMode: false,
    // 多模态能力配置：启用文件上传功能
    multimodal: {
      supportImages: true, // 支持图片上传
      maxFileSize: 10, // 最大文件大小 10MB
      supportedMimeTypes: ['image/'] // 支持的文件类型：所有图片格式
    },
    icon: IconModelDeepseek as unknown as Component
  },
```

通过以上配置，您可以选择本地 `Ollama` 大模型支持进行对话。
