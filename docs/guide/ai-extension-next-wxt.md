# mcp-servers 扩展插件工具开发指南

本文档将详细介绍如何在 AI Extension 浏览器扩展中开发 mcp-server 工具，包括工具调用的参数说明、meta.ts 配置文件的字段含义以及工具注册方法。

## 概述

mcp-servers 是 AI Extension 浏览器扩展的核心功能模块，它允许你为特定的网站域名注册 MCP（Model Context Protocol）工具。当用户访问匹配的网站时，这些工具可以被 AI 助手调用，实现对网页的操作和控制。

## 前置准备

在开始开发 mcp-server 工具之前，你需要先获取项目代码并完成环境配置。

### Fork 仓库

1. 访问 [next-sdk 仓库](https://github.com/opentiny/next-sdk)
2. 点击右上角的 "Fork" 按钮，将仓库 Fork 到你的 GitHub 账号

### Clone 仓库

Fork 完成后，将仓库克隆到本地：

```bash
# 克隆你 Fork 的仓库（将 YOUR_USERNAME 替换为你的 GitHub 用户名）
git clone https://github.com/YOUR_USERNAME/next-sdk.git

# 或者使用 SSH（如果你配置了 SSH 密钥）
git clone git@github.com:YOUR_USERNAME/next-sdk.git

# 进入项目目录
cd next-sdk
```

### 安装依赖

项目使用 pnpm 作为包管理器，请先确保已安装 pnpm：

```bash
# 如果未安装 pnpm，可以使用 npm 安装
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 配置上游仓库（可选）

为了保持与主仓库同步，建议添加上游仓库：

```bash
# 添加上游仓库
git remote add upstream https://github.com/opentiny/next-sdk.git

# 验证远程仓库配置
git remote -v
```

完成以上步骤后，你就可以开始开发 mcp-server 工具了。

## 浏览器版本要求

由于扩展使用了 `userScripts` API，需要以下最低浏览器版本：

- **Chrome**：>= 120.0.0
- **Microsoft Edge**：>= 120.0.0
- **其他基于 Chromium 的浏览器**：版本 >= 120.0.0（基于 Chromium 120+）

**重要提示**：

- `userScripts` API 是 Chrome 120 中引入的新特性，用于在页面的主世界（Main World）中执行脚本
- 如果你的浏览器版本低于 120，请先更新浏览器
- 如果 `meta.ts` 中的 `type` 设置为 `'pageMcpServer'`，**必须**在扩展管理页面开启 User Scripts 权限
- 如果 `meta.ts` 中的 `type` 设置为 `'contentScriptMcpServer'`，不需要开启 User Scripts 权限

## 目录结构

mcp-servers 工具位于 `packages/next-wxt/mcp-servers/` 目录下，每个域名对应一个子目录：

```text
packages/next-wxt/mcp-servers/
├── index.ts              # 工具加载和匹配逻辑
├── types.d.ts            # TypeScript 类型定义
├── www.baidu.com/        # 百度网站工具示例
│   ├── meta.ts          # 工具元信息配置
│   └── index.ts         # 工具注册实现
├── opentiny.design/      # OpenTiny 网站工具示例
│   ├── meta.ts
│   └── index.ts
└── excalidraw.com/       # Excalidraw 网站工具示例
    ├── meta.ts
    └── index.ts
```

## 创建新的 mcp-server 工具

### 步骤一：创建工具目录

在 `packages/next-wxt/mcp-servers/` 目录下创建以目标网站域名命名的文件夹，例如：

```bash
mkdir -p packages/next-wxt/mcp-servers/example.com
```

### 步骤二：创建 meta.ts 配置文件

在新建的目录中创建 `meta.ts` 文件，用于定义工具的元信息。

## meta.ts 配置文件详解

`meta.ts` 文件用于配置 mcp-server 的基本信息和行为。以下是所有可用字段的详细说明：

### 完整配置示例

```typescript
export default {
  name: 'example.com',                    // 必填：域名标识
  type: 'contentScriptMcpServer',         // 必填：MCP 服务器类型
  url: 'https://example.com',             // 必填：目标网站 URL
  isAlwaysEnabled: true,                  // 必填：是否始终启用
  toolsJumpLinks: {                       // 可选：工具跳转链接映射
    'tool-name': 'https://example.com/path'
  },
  customMarketMcpServers: [               // 可选：自定义 MCP 市场服务列表
    {
      id: 'ppt-mcp',
      name: 'PPT文档MCP服务器',
      description: '可以创建、编辑、保存PPT文档',
      icon: 'https://your-mcp-server-icon-url.com/icon.png',
      url: 'https://your-mcp-server-url.com/servers/ppt-mcp/sse',
      type: 'sse',
      enabled: false,
      addState: 'idle',
      tools: []
    }
  ],
  version: '1.0.0'                        // 必填：版本号
}
```

### 字段说明

#### name（必填）

- **类型**：`string`
- **说明**：工具的唯一标识符，通常使用目标网站的域名（不包含协议和路径）
- **示例**：`'www.baidu.com'`、`'opentiny.design'`、`'excalidraw.com'`
- **注意**：此字段必须与目录名称一致，系统会根据此字段匹配当前访问的网站域名

```typescript
name: 'example.com'
```

#### type（必填）

- **类型**：`'pageMcpServer' | 'contentScriptMcpServer'`
- **说明**：MCP 服务器的类型，决定工具在哪个上下文中执行
- **可选值**：
  - `'pageMcpServer'`：页面级 MCP 服务器，工具在页面的主世界（Main World）中执行，可以访问页面的完整 DOM 和 JavaScript 环境
  - `'contentScriptMcpServer'`：内容脚本级 MCP 服务器，工具在内容脚本（Content Script）隔离环境中执行
- **选择建议**：
  - 如果需要访问页面的全局变量、React/Vue 等框架的内部状态，使用 `'pageMcpServer'`
  - 如果需要与扩展的其他部分（如 background、sidepanel）进行通信，使用 `'contentScriptMcpServer'`

**重要提示**：如果 `type` 设置为 `'pageMcpServer'`，**必须**在扩展管理页面开启 User Scripts 权限，否则工具将无法正常工作。

**为什么需要开启 User Scripts 权限？**

- `pageMcpServer` 类型的工具需要在页面的主世界（Main World）中执行脚本
- 传统的 Content Script 运行在隔离环境中，无法访问页面的全局变量和 JavaScript 上下文
- User Scripts API 允许扩展在页面的主世界中执行脚本，从而可以访问页面的完整 JavaScript 环境
- User Scripts API 需要 Chrome 120+ 版本的浏览器支持

**如何开启 User Scripts 权限？**

1. 打开扩展管理页面（`chrome://extensions/` 或 `edge://extensions/`）
2. 找到已安装的扩展卡片
3. 点击扩展卡片上的"详细信息"或展开按钮
4. 找到"User Scripts"或"用户脚本"选项
5. 将开关切换到"开启"状态

**未开启 User Scripts 权限会怎样？**

- 扩展会显示通知提示你开启 User Scripts 权限
- `pageMcpServer` 类型的工具将无法正常工作
- 工具调用会失败，并显示错误信息

```typescript
type: 'contentScriptMcpServer'  // 或 'pageMcpServer'
```

#### url（必填）

- **类型**：`string`
- **说明**：目标网站的完整 URL，包括协议（http/https）
- **示例**：`'https://www.baidu.com'`、`'https://excalidraw.com'`
- **注意**：此 URL 用于在 sidepanel 中打开新标签页时使用，确保 URL 格式正确

```typescript
url: 'https://example.com'
```

#### isAlwaysEnabled（必填）

- **类型**：`boolean`
- **说明**：是否始终启用此工具。当设置为 `true` 时，无论用户是否访问该网站，工具都会在 sidepanel 中显示并可用
- **用途**：
  - `true`：工具始终可用，AI 助手可以在任何页面调用此工具，系统会自动打开或切换到目标网站
  - `false`：工具仅在用户访问匹配的网站时可用
- **推荐**：对于常用的工具，建议设置为 `true`，提高工具的可用性

```typescript
isAlwaysEnabled: true  // 或 false
```

#### toolsJumpLinks（可选）

- **类型**：`Record<string, string>`
- **说明**：工具名称到 URL 的映射，用于定义每个工具对应的页面 URL
- **用途**：当 AI 助手调用某个工具时，如果当前页面不匹配，系统会根据此映射打开相应的 URL
- **格式**：键为工具名称（与 `registerTool` 中注册的工具名称一致），值为对应的 URL
- **示例**：

```typescript
toolsJumpLinks: {
  'get-page-title': 'https://www.baidu.com/s?wd=get-page-title',
  'search-content': 'https://www.baidu.com/s?wd=search'
}
```

**注意**：

- 如果工具需要特定的页面状态或 URL 参数，可以通过此字段配置
- 如果不配置此字段，系统会使用 `url` 字段的值作为默认 URL

#### customMarketMcpServers（可选）

- **类型**：`PluginInfo[]`
- **说明**：定义需要追加到 TinyRemoter 插件市场的自定义 MCP 服务器配置，sidepanel 会自动收集并合并这些配置
- **结构示例**：

```typescript
customMarketMcpServers: [
  {
    id: 'ppt-mcp',
    name: 'PPT文档MCP服务器',
    description: '可以创建、编辑、保存PPT文档',
    icon: 'https://your-mcp-server-icon-url.com/icon.png',
    url: 'https://your-mcp-server-url.com/servers/ppt-mcp/sse',
    type: 'sse',
    enabled: false,
    addState: 'idle',
    tools: []
  }
]
```

**提示**：该字段完全可选，仅在某个站点需要对插件市场推荐/预设特定 MCP 服务时才需要配置（中文注释：未配置则不会额外展示该站点的专属服务）。

#### version（必填）

- **类型**：`string`
- **说明**：工具的版本号，遵循语义化版本规范（Semantic Versioning）
- **格式**：`'主版本号.次版本号.修订号'`，例如 `'1.0.0'`、`'1.2.3'`
- **用途**：用于版本管理和工具更新追踪

```typescript
version: '1.0.0'
```

### meta.ts 完整示例

```typescript
// packages/next-wxt/mcp-servers/www.baidu.com/meta.ts
export default {
  name: 'www.baidu.com',
  type: 'contentScriptMcpServer',
  url: 'https://www.baidu.com',
  isAlwaysEnabled: true,
  toolsJumpLinks: {
    'get-page-title': 'https://www.baidu.com/s?wd=get-page-title'
  },
  version: '1.0.0'
}
```

## 工具注册实现（index.ts）

在工具目录中创建 `index.ts` 文件，用于注册具体的 MCP 工具。

### 工具注册函数签名

工具注册函数接收一个参数对象，包含以下属性：

```typescript
export default ({ server, z, cookie }) => {
  // 工具注册逻辑
}
```

### 参数说明

#### server

- **类型**：`WebMcpServer` 实例或代理对象
- **说明**：MCP 服务器实例，用于注册工具
- **方法**：
  - `server.registerTool(toolName, config, handler)`：注册一个工具
    - `toolName`（string）：工具名称，唯一标识符
    - `config`（object）：工具配置对象
      - `title`（string）：工具标题，用于 AI 助手识别工具用途
      - `description`（string）：工具描述，详细说明工具的功能
      - `inputSchema`（object）：输入参数模式，使用 Zod 定义
    - `handler`（function）：工具处理函数，接收参数对象，返回结果

```typescript
server.registerTool(
  'tool-name',
  {
    title: '工具标题',
    description: '工具详细描述',
    inputSchema: {
      param1: z.string().describe('参数1描述'),
      param2: z.number().describe('参数2描述')
    }
  },
  async ({ param1, param2 }) => {
    // 工具执行逻辑
    return {
      content: [{ type: 'text', text: '执行结果' }]
    }
  }
)
```

#### z

- **类型**：Zod 模式验证库
- **说明**：用于定义工具输入参数的类型和验证规则
- **常用方法**：
  - `z.string()`：字符串类型
  - `z.number()`：数字类型
  - `z.boolean()`：布尔类型
  - `z.object({})`：对象类型
  - `z.array()`：数组类型
  - `.describe()`：添加参数描述
  - `.optional()`：可选参数
  - `.default()`：默认值

**示例**：

```typescript
// 字符串参数
inputSchema: {
  text: z.string().describe('要搜索的文本内容')
}

// 数字参数
inputSchema: {
  count: z.number().describe('要获取的数量')
}

// 对象参数
inputSchema: {
  options: z.object({
    color: z.string().describe('颜色值'),
    size: z.number().describe('尺寸大小')
  }).describe('配置选项')
}

// 可选参数
inputSchema: {
  text: z.string().optional().describe('可选文本')
}

// 带默认值的参数
inputSchema: {
  timeout: z.number().default(5000).describe('超时时间（毫秒）')
}
```

#### cookie

- **类型**：`Record<string, string>`
- **说明**：当前页面的 Cookie 数据，以键值对形式提供
- **用途**：用于需要认证的操作，例如获取用户信息、执行需要登录的操作等
- **注意**：Cookie 数据是只读的，不能直接修改，修改 Cookie 需要通过 `document.cookie` API

**示例**：

```typescript
export default ({ server, z, cookie }) => {
  server.registerTool(
    'get-user-info',
    {
      title: '获取用户信息',
      description: '根据 Cookie 获取当前登录用户信息',
      inputSchema: {}
    },
    async () => {
      // 使用 cookie 参数
      const userId = cookie['user_id']
      const token = cookie['auth_token']
      
      if (!userId || !token) {
        return {
          content: [{ type: 'text', text: '用户未登录' }]
        }
      }
      
      // 执行需要认证的操作
      // ...
      
      return {
        content: [{ type: 'text', text: `用户ID: ${userId}` }]
      }
    }
  )
}
```

### 工具注册完整示例

#### 示例一：简单工具（获取页面标题）

```typescript
// packages/next-wxt/mcp-servers/www.baidu.com/index.ts
export default ({ server, z }) => {
  server.registerTool(
    'get-page-title',
    {
      title: '获取页面标题',
      description: '获取当前页面的标题文本'
    },
    async () => {
      const title = document.title
      return {
        content: [{ type: 'text', text: title }]
      }
    }
  )
}
```

#### 示例二：带参数的工具（填充搜索框）

```typescript
// packages/next-wxt/mcp-servers/www.baidu.com/index.ts
export default ({ server, z }) => {
  server.registerTool(
    'fill-search-box',
    {
      title: '填充搜索框',
      description: '在搜索框中填充指定的文本内容',
      inputSchema: {
        text: z.string().describe('要填充的文本内容')
      }
    },
    async ({ text }) => {
      const searchBox = document.querySelector('#kw') // 百度搜索框的选择器
      if (searchBox) {
        searchBox.value = text
        // 触发输入事件，确保页面能识别输入
        searchBox.dispatchEvent(new Event('input', { bubbles: true }))
        return {
          content: [{ type: 'text', text: `已填充文本: ${text}` }]
        }
      } else {
        return {
          content: [{ type: 'text', text: '未找到搜索框' }]
        }
      }
    }
  )
}
```

#### 示例三：复杂工具（使用 Cookie）

```typescript
// packages/next-wxt/mcp-servers/example.com/index.ts
export default ({ server, z, cookie }) => {
  server.registerTool(
    'get-user-profile',
    {
      title: '获取用户资料',
      description: '获取当前登录用户的资料信息',
      inputSchema: {}
    },
    async () => {
      // 检查用户是否登录
      const sessionId = cookie['session_id']
      if (!sessionId) {
        return {
          content: [{ type: 'text', text: '用户未登录，请先登录' }]
        }
      }
      
      // 模拟获取用户信息
      try {
        // 这里可以调用 API 或从 DOM 中提取信息
        const userInfo = {
          name: '示例用户',
          email: 'user@example.com',
          role: 'admin'
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(userInfo, null, 2) 
          }]
        }
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: `获取用户信息失败: ${error.message}` 
          }]
        }
      }
    }
  )
}
```

#### 示例四：多工具注册

```typescript
// packages/next-wxt/mcp-servers/opentiny.design/index.ts
export default ({ server, z }) => {
  // 工具一：生成页面背景颜色
  server.registerTool(
    'generate-color',
    {
      title: '生成页面背景颜色',
      description: '根据传入的颜色值设置页面背景颜色',
      inputSchema: {
        color: z.string().describe('十六进制颜色值，例如 #000000')
      }
    },
    async ({ color }) => {
      document.body.style.backgroundColor = color
      return {
        content: [{ type: 'text', text: `背景颜色已设置为: ${color}` }]
      }
    }
  )
  
  // 工具二：获取页面元素
  server.registerTool(
    'get-elements',
    {
      title: '获取页面元素',
      description: '根据选择器获取页面元素信息',
      inputSchema: {
        selector: z.string().describe('CSS 选择器，例如 .class-name 或 #id-name')
      }
    },
    async ({ selector }) => {
      const elements = document.querySelectorAll(selector)
      const result = Array.from(elements).map((el, index) => ({
        index,
        tagName: el.tagName,
        textContent: el.textContent?.trim().substring(0, 100), // 限制文本长度
        className: el.className,
        id: el.id
      }))
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      }
    }
  )
}
```

## 自定义市场 MCP 插件聚合

若某些站点 `meta.ts` 配置了 `customMarketMcpServers`，sidepanel 会自动把它们聚合并传给 TinyRemoter，流程如下：

1. `packages/next-wxt/entrypoints/sidepanel/useCustomMarketMcpServers.ts` 遍历所有 `metaModules`，收集存在 `customMarketMcpServers` 字段的站点配置，然后拼成一个 `Ref<PluginInfo[]>`（中文注释：空配置会被过滤，避免重复）
2. `packages/next-wxt/entrypoints/sidepanel/App.vue` 中，通过 `const customMarketMcpServers = useCustomMarketMcpServers()` 拿到 Step1 的结果，并在 `<TinyRemoter :custom-market-mcp-servers="customMarketMcpServers" />` 中直接传入
3. TinyRemoter 内部会把这些扩展端的配置与内置 `DEFAULT_SERVERS` 合并，最终统一显示在“插件市场”中

借助该机制，每个网站目录都可以按需推荐专属 MCP 服务，而 sidepanel 与组件层的代码保持稳定；普通 Web 应用同样可以直接传入 `customMarketMcpServers`，实现与扩展一致的市场展示体验。

## 工具返回值格式

工具处理函数必须返回一个包含 `content` 属性的对象：

```typescript
return {
  content: [
    {
      type: 'text',
      text: '返回的文本内容'
    }
  ]
}
```

### content 数组

- **类型**：`Array<{ type: string, text: string }>`
- **说明**：返回内容数组，目前支持 `type: 'text'` 类型
- **text**：要返回的文本内容，可以是普通文本或 JSON 字符串

### 错误处理

工具执行过程中如果发生错误，应该返回错误信息而不是抛出异常：

```typescript
try {
  // 工具执行逻辑
  return {
    content: [{ type: 'text', text: '执行成功' }]
  }
} catch (error) {
  return {
    content: [{ 
      type: 'text', 
      text: `执行失败: ${error.message}` 
    }]
  }
}
```

## 工具匹配机制

系统会根据当前访问的网站域名自动匹配对应的工具：

1. 获取当前页面的域名（`window.location.hostname`）
2. 在 `mcp-servers` 目录中查找匹配的目录名称
3. 如果找到匹配的目录，加载该目录下的 `index.ts` 文件
4. 调用工具注册函数，传入 `server`、`z` 和 `cookie` 参数

### 域名匹配规则

- 域名必须完全匹配，例如 `www.baidu.com` 不能匹配 `baidu.com`
- 系统会自动处理子域名，例如 `subdomain.example.com` 会匹配 `example.com` 目录（如果存在）

## 最佳实践

### 1. 工具命名

- 使用有意义的工具名称，例如 `get-page-title` 而不是 `tool1`
- 使用小写字母和连字符，遵循 kebab-case 命名规范
- 工具名称应该清晰描述工具的功能

### 2. 参数定义

- 为每个参数添加详细的描述，帮助 AI 助手理解参数用途
- 使用合适的 Zod 类型验证，确保参数类型正确
- 为可选参数使用 `.optional()`
- 为有默认值的参数使用 `.default()`

### 3. 错误处理

- 始终使用 try-catch 捕获错误
- 返回有意义的错误信息，而不是抛出异常
- 检查 DOM 元素是否存在，避免空指针错误

### 4. 性能优化

- 避免在工具中执行耗时的操作
- 对于需要等待的操作，使用 `setTimeout` 或 `Promise`
- 限制返回数据的体积，避免返回过大的 JSON 对象

### 5. 安全性

- 不要在处理函数中执行危险的 DOM 操作
- 验证用户输入，防止 XSS 攻击
- 谨慎使用 `eval` 或 `Function` 构造函数

## 总结

通过本文档，你应该已经了解了如何开发 mcp-server 工具：

1. 创建工具目录和配置文件（`meta.ts`）
2. 实现工具注册逻辑（`index.ts`）
3. 使用 `server.registerTool` 注册工具
4. 使用 `z` 定义参数验证规则
5. 使用 `cookie` 访问 Cookie 数据
6. 返回正确格式的结果

如果你在开发过程中遇到问题，可以参考项目中的示例代码，或查看浏览器控制台的错误信息。
