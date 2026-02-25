# 模块子路由动态加载功能使用指南

## 功能概述

此功能允许大型网站按子路由划分多个模块，每个子模块可以：
- 包含独立的工具定义文件
- 关联特定的子路由 URL
- 根据 `isAlwaysEnabled` 配置决定加载方式：
  - **`isAlwaysEnabled: true`**：在 sidepanel 中自动加载所有工具（包括子模块），调用时自动跳转到对应路由
  - **`isAlwaysEnabled: false`**：只在对应的子路由页面加载相应的工具（按需加载）

## 配置示例

### 1. 配置 meta.ts

在网站的 `meta.ts` 文件中添加 `modules` 配置：

```typescript
// packages/next-wxt/mcp-servers/example.com/meta.ts
export default {
  name: 'example.com',
  type: 'pageMcpServer',
  url: 'https://example.com',
  // isAlwaysEnabled 控制工具加载方式
  isAlwaysEnabled: true,  // true: sidepanel 自动加载并跳转; false: 按页面按需加载
  modules: {
    // 子模块名称
    dashboard: {
      // 子模块对应的完整 URL
      url: 'https://example.com/dashboard',
      // 工具文件入口（相对于 meta.ts 所在目录）
      entry: 'dashboard/index.ts'
    },
    settings: {
      url: 'https://example.com/settings',
      entry: 'settings/index.ts'
    }
  },
  version: '1.0.0'
}
```

### 2. 创建子模块工具文件

在指定的 `entry` 路径创建工具文件：

```typescript
// packages/next-wxt/mcp-servers/example.com/dashboard/index.ts
export default ({ server, z }) => {
  server.registerTool(
    'getDashboardData',
    {
      title: '获取仪表盘数据',
      description: '获取仪表盘的统计数据',
      inputSchema: {}
    },
    async () => {
      // 工具逻辑
      // 如果 isAlwaysEnabled: true，调用此工具时会自动跳转到 /dashboard
      return {
        content: [{ type: 'text', text: '仪表盘数据...' }]
      }
    }
  )
}
```

## 工作原理

### 1. 动态加载机制

系统通过 `import.meta.glob` 动态加载所有模块文件：

```typescript
// 主模块（每个域名的 index.ts）
const modules = import.meta.glob('./*/index.ts', { eager: true })

// 元信息（每个域名的 meta.ts）
const metaModules = import.meta.glob('./*/meta.ts', { eager: true })

// 所有子模块文件
const allModules = import.meta.glob('./*/**/*.ts', { eager: true })
```

### 2. 两种加载模式

#### 模式 1: isAlwaysEnabled = true（推荐用于全局工具）

- **加载位置**：在 sidepanel 中自动加载所有工具（主模块 + 子模块）
- **路由跳转**：调用工具时，由 `mcpServer.ts` 中的 `createProxServer` 自动跳转到对应的子模块 URL
- **适用场景**：需要随时访问的全局工具，如网站管理、数据分析等

**工作流程**：
1. Sidepanel 启动时加载所有 `isAlwaysEnabled: true` 的工具
2. 用户调用子模块工具时，系统检查工具名称对应的 URL
3. 自动打开或切换到对应的标签页
4. 等待页面初始化完成后执行工具

#### 模式 2: isAlwaysEnabled = false（按需加载）

- **加载位置**：只在打开对应的子路由页面时加载该页面的工具
- **路由跳转**：无需跳转，工具只在当前页面可用
- **适用场景**：页面特定的工具，如只在编辑器页面才需要的编辑操作

**工作流程**：
1. 用户访问 `https://example.com/dashboard`
2. Content script 根据当前 URL 加载对应的主模块和匹配的子模块工具
3. 工具只在当前页面可用，不会出现在 sidepanel 的工具列表中

### 3. 路由解析优先级

在 `mcpServer.ts` 的 `resolveTargetUrl` 函数中，URL 解析优先级如下：

1. **子模块 URL**：优先检查工具是否属于子模块，使用 `modules[moduleName].url`
2. **toolsJumpLinks**：检查 `meta.toolsJumpLinks[toolName]` 配置
3. **默认 URL**：使用 `meta.url`

```typescript
const resolveTargetUrl = (toolName: string) => {
  // 1. 优先检查是否是子模块工具
  const moduleInfo = toolModuleMap.get(toolName)
  if (moduleInfo && moduleInfo.domain === meta.name) {
    return moduleInfo.moduleUrl  // 返回子模块 URL
  }
  
  // 2. 其次检查 toolsJumpLinks 配置
  if (meta.toolsJumpLinks?.[toolName]) {
    return meta.toolsJumpLinks[toolName]
  }
  
  // 3. 最后使用默认 URL
  return meta.url
}
```

### 4. 工具注册流程

子模块工具在注册时会被记录到 `toolModuleMap` 映射表：

```typescript
// 在 loadSubModuleTools 中
params.server.registerTool = (toolName: string, ...args: any[]) => {
  // 记录工具所属的模块信息
  toolModuleMap.set(toolName, {
    moduleName: 'dashboard',
    moduleUrl: 'https://example.com/dashboard',
    domain: 'example.com'
  })
  
  // 调用原始的 registerTool
  return originalRegisterTool(toolName, ...args)
}
```

## 实际示例：Excalidraw

### 配置文件

```typescript
// packages/next-wxt/mcp-servers/excalidraw.com/meta.ts
export default {
  name: 'excalidraw.com',
  type: 'pageMcpServer',
  url: 'https://excalidraw.com',
  isAlwaysEnabled: true,  // 在 sidepanel 中自动加载
  modules: {
    library: {
      url: 'https://excalidraw.com/#room',
      entry: 'library/index.ts'
    }
  },
  version: '1.0.0'
}
```

### 子模块工具

```typescript
// packages/next-wxt/mcp-servers/excalidraw.com/library/index.ts
export default ({ server, z }) => {
  server.registerTool(
    'getCollaborationRoomInfo',
    {
      title: '获取协作房间信息',
      description: '获取当前协作房间的信息',
      inputSchema: {}
    },
    async () => {
      // 调用此工具时，会自动跳转到 https://excalidraw.com/#room
      const url = new URL(window.location.href)
      const roomId = url.hash.split(',')[0].replace('#room=', '')
      
      return {
        content: [{ 
          type: 'text', 
          text: `房间 ID: ${roomId}` 
        }]
      }
    }
  )
}
```

## 目录结构

```
packages/next-wxt/mcp-servers/
├── excalidraw.com/
│   ├── meta.ts                    # 主配置文件（含 modules 配置）
│   ├── index.ts                   # 主模块工具
│   └── library/                   # 子模块目录
│       └── index.ts               # 子模块工具
├── index.ts                       # 动态加载逻辑
└── types.d.ts                     # 类型定义
```

## 关键文件说明

### 1. `mcp-servers/index.ts`
- 实现子模块动态加载逻辑
- 维护工具名称到模块信息的映射表 `toolModuleMap`
- 导出 `getAllMcpServersByIsAlwaysEnabled` 用于 sidepanel 加载
- 导出 `getMcpToolByHostname` 用于 content script 按页面加载
- 导出 `getToolModuleMap` 用于路由解析

### 2. `entrypoints/sidepanel/mcpServer.ts`
- 使用 `getAllMcpServersByIsAlwaysEnabled` 加载所有 `isAlwaysEnabled: true` 的工具
- 通过 `createProxServer` 包装工具调用，实现自动路由跳转
- 使用 `resolveTargetUrl` 根据优先级解析目标 URL
- 复用现有的页面打开、标签页切换和初始化等待逻辑

### 3. `utils/createMcpServer.ts`
- 在 content script 中创建 MCP 服务器
- 根据当前页面 URL 加载匹配的主模块和子模块工具
- 不需要路由跳转逻辑（工具只在对应页面加载）

### 4. `mcp-servers/types.d.ts`
- 定义 `ModuleConfig` 接口：子模块配置
- 定义 `MetaConfig` 接口：元信息配置
- 定义 `ModuleInfo` 接口：工具到模块的映射信息

## 配置建议

### 何时使用 isAlwaysEnabled: true

- 需要从任何页面访问的全局工具
- 跨页面的数据查询和分析工具
- 网站管理和配置工具
- 需要在不同子路由之间切换的工作流

### 何时使用 isAlwaysEnabled: false

- 页面特定的操作工具
- 只在特定路由才有意义的功能
- 大型应用的模块化工具（避免一次性加载过多工具）
- 需要减少内存占用和启动时间的场景

## 注意事项

1. **路径格式**：`entry` 字段使用相对于 `meta.ts` 所在目录的相对路径
2. **URL 匹配**：系统会比较 origin 和 pathname，忽略 query 和 hash
3. **工具命名**：子模块工具保持原始名称，不添加前缀
4. **主模块优先**：如果存在主模块工具，会先注册主模块，再注册子模块
5. **导航等待**：`mcpServer.ts` 会等待页面初始化完成后再执行工具
6. **映射表唯一性**：工具名称在同一域名下应该唯一，避免冲突

## 调试建议

1. **查看控制台日志**：系统会打印工具注册和路由跳转信息
2. **检查文件路径**：确保 `entry` 路径正确且文件存在
3. **验证 URL 格式**：确保子模块 URL 是完整的 URL
4. **测试路由跳转**：可以手动调用工具验证自动跳转是否正常
5. **检查映射表**：在控制台调用 `getToolModuleMap()` 查看工具映射

## 兼容性

- 兼容现有的 `toolsJumpLinks` 配置
- 向后兼容没有 `modules` 配置的旧项目
- 支持主模块和子模块混合使用
- 支持两种加载模式的混合配置
