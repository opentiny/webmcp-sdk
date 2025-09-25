# Electron 应用接入

<Info>
以下是将 Electron 集成到普通前端项目并接入 NEXT-SDKs 的详细指南。
</Info>

## 1. 项目准备

首先，确保你的项目已经具备以下条件：

- 使用现代前端构建工具（如 Vite、Webpack 等）
- 项目可以正常运行和构建
- 使用包管理器（如 Npm、Yarn、Pnpm 等）

## 2. 安装 Electron 相关依赖

```bash
# 安装 Electron 核心依赖
npm install --save-dev electron vite-plugin-electron vite-plugin-electron-renderer

# 如果使用 TypeScript ，还需要安装类型定义
npm install --save-dev @types/node

# 如果需要打包成可执行文件，安装  electron-builder
npm install --save-dev electron-builder

# 如果需要在开发环境中同时运行多个命令，安装 concurrently 和 wait-on
npm install --save-dev concurrently wait-on
```

完整依赖列表：

* **electron** - Electron 核心运行时
* **vite-plugin-electron** - Vite 的 Electron 插件，用于简化 Electron 开发
* **vite-plugin-electron-renderer** - Vite 的 Electron 渲染进程插件
* **electron-builder** - Electron 应用打包工具
* **@types/node** - Node.js 的 TypeScript 类型定义
* **concurrently** - 允许同时运行多个命令
* **wait-on** - 等待资源可用的工具，用于确保开发服务器启动后再启动 Electron

## 3. 配置 package.json

在 package.json 中添加 Electron 相关的脚本和配置：

```json
{
  "main": "dist-electron/index.js",
  "scripts": {
    "dev": "vite",
    "dev:web": "vite",
    "dev:electron": "npm run build:main && concurrently \"vite\" \"wait-on http://localhost:3060 && electron .\"",
    "build:main": "tsc -p tsconfig.main.json && copy main\\preload.js dist-electron\\preload.js",
    "build": "vite build && npm run build:main",
    "build:web": "vite build",
    "build:exe": "npm run build && electron-builder",
    "preview": "vite preview",
    "electron:dev": "npm run dev:electron",
    "electron:build": "npm run build:exe"
  },
  "build": {
    "appId": "com.example.yourapp",
    "asar": false,
    "files": ["dist/**/*", "dist-electron/**/*"],
    "directories": {
      "buildResources": "build"
    },
    "win": {
      "target": "nsis"
    }
  }
}
```

## 4. 创建 Electron 主进程文件

创建 main/index.ts 文件：

```typescript
// main/index.ts
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 在ES模块中获取 __dirname 的等效值
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // 检查是否为开发环境
  if (process.env.VITE_DEV_SERVER_URL) {
    // 开发环境 - 加载 Vite 开发服务器
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    // 生产环境 - 加载本地文件
    const indexPath = path.join(__dirname, '../dist/index.html');
    win.loadFile(indexPath);

    // 处理加载失败的情况
    win.webContents.on(
      'did-fail-load',
      (event, errorCode, errorDescription) => {
        console.log('Failed to load file:', errorCode, errorDescription);
        if (errorCode === -6) {
          // ERR_FILE_NOT_FOUND
            win.loadFile(indexPath);
        }
      },
    );
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

创建 main/preload.js 文件：

```javascript
// main/preload.js
window.addEventListener('DOMContentLoaded', () => {
  // 可以在这里暴露 API 给渲染进程
});
```

## 5. 配置 TypeScript

创建 tsconfig.main.json 文件用于主进程编译：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist-electron",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "strict": true,
    "allowJs": true,
    "types": ["node"],
    "resolveJsonModule": true
  },
  "include": ["main/**/*"]
}
```

## 6. 配置 Vite

更新 vite.config.ts 文件：

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'; // 根据你的框架选择插件
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';

// https://vitejs.dev/config/
export default defineConfig({
  // 添加 base 配置以支持 Electron 环境
  base: './',
  plugins: [
    vue(), // 根据你的框架选择插件
    electron({
      entry: 'main/index.ts',
      vite: {
        build: {
          outDir: 'dist-electron',
          rollupOptions: {
            output: {
              format: 'es',
            },
          },
        },
      },
    }),
    electronRenderer(),
  ],
  server: {
    hmr: {
      overlay: true,
    },
    port: 3060,
    open: false,
    host: true,
  },
});
```

## 7. 处理环境检测

在前端代码中添加 Electron 环境检测函数：

```typescript
// 检查是否在 Electron 环境中运行
const isElectron = (): boolean => {
  // 在 Electron 环境中，window.process 和 window.process.versions.electron 都存在
  // @ts-ignore
  return (
    typeof window !== 'undefined' &&
    window.process &&
    window.process.versions &&
    window.process.versions.electron
  );
};
```

根据运行环境动态设置 API 请求 URL：

```typescript
// 根据运行环境确定正确的 API URL
let apiUrl;
if (isElectron()) {
  // Electron 环境中使用完整 URL
  apiUrl = 'http://localhost:3060/api';
} else {
  // Web 环境使用相对路径
  apiUrl = '/api';
}
```

## 8. 构建和打包

使用以下命令进行开发和构建：

```bash
# 开发模式 - 启动 Web 开发服务器
npm run dev:web

# 开发模式 - 启动 Electron 应用
npm run electron:dev

# 构建 Web 应用
npm run build:web

# 构建 Electron 应用并打包成 exe
npm run electron:build
```

## 9. 注意事项

1. **资源路径处理**：在 Electron 中，确保静态资源路径正确处理，使用相对路径或配置正确的 base 路径。

2. **API 请求处理**：区分 Electron 环境和 Web 环境，为不同环境配置正确的 API 请求地址。

3. **安全性**：保持 contextIsolation 为 true 以确保安全性，通过 preload.js 暴露必要 API。

4. **错误处理**：为主进程添加适当的错误处理机制，特别是页面加载失败的情况。

5. **打包配置**：在 package.json 中正确配置 electron-builder 的选项，确保打包包含所有必要文件。

通过以上步骤，你可以成功将 Electron 集成到普通前端项目中，实现桌面应用的开发和发布。

## MCP 接入流程

### 1. 安装依赖

首先需要安装 MCP 相关的依赖包：

```bash
npm install @opentiny/next-sdk @opentiny/next-remoter
```

### 2. 项目配置

在 Vite 配置文件 `vite.config.ts` 中添加代理配置，用于连接 AI Agent 服务：

```typescript
server: {
  proxy: {
    // 代理 /agent 开头的请求到 AI Agent 服务
    '/agent': {
      target: 'https://ai.opentiny.design',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/agent/, '')
    }
  }
}
```

### 3. 初始化 MCP 客户端（以Vue为例）

在应用的主入口文件App.vue中初始化 MCP 客户端：

```javascript
import { WebMcpClient, createMessageChannelPairTransport } from '@opentiny/next-sdk'
import { TinyRemoter } from '@opentiny/next-remoter'

// 创建消息通道传输
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// 定义 MCP Server 的能力
const capabilities = {
  prompts: { listChanged: true },
  resources: { subscribe: true, listChanged: true },
  tools: { listChanged: true },
  completions: {},
  logging: {}
}

// 提供 MCP Server 实例给应用
const mcpServer = {
  transport: serverTransport,
  capabilities
}

provide('mcpServer', mcpServer)
```

### 4. 建立连接

创建与代理的连接：

```javascript
const createProxyTransport = async () => {
  const client = new WebMcpClient(
    { name: 'mcp-web-client', version: '1.0.0' },
    { capabilities: { roots: { listChanged: true }, sampling: {}, elicitation: {} } }
  )

  // 连接客户端传输
  await client.connect(clientTransport)

  // 连接到 MCP 代理
  const { sessionId } = await client.connect({
    url: AGENT_ROOT + 'mcp',
    sessionId: '78b66563-95c0-4839-8007-e8af634dd659',
    agent: true,
    onError: (error: Error) => {
      console.error('Connect proxy error:', error)
    }
  })

  window.addEventListener('pagehide', client.onPagehide)
}

createProxyTransport()
```

### 5. 注册工具

在子界面中创建server并注册可供 AI 代理调用的工具：

```javascript
import { WebMcpServer, z } from '@opentiny/next-sdk'

const mcpServer = inject('mcpServer') as { transport: any; capabilities: any }
const server = new WebMcpServer({ name: 'base-config', version: '1.0.0' }, { capabilities: mcpServer.capabilities })

server.registerTool('demo-tool', {
  title: '演示工具',
  description: '一个简单工具',
  inputSchema: { foo: z.string() },
}, async (params) => {
  console.log('params:', params)
  return { content: [{ type: 'text', text: `收到: ${params.foo}` }] }
})

onMounted(async () => {
  await server.connect(mcpServer.transport)
})
```

## 运行和调试

### 开发模式

```bash
npm run dev           # 启动 Vite 前端开发
npm run electron:dev  # 启动 Electron 主进程开发
```

### 构建和打包

```bash
npm run build         # 构建前端
npm run electron:build # 打包为 Windows 桌面应用
```

这将使用 `@modelcontextprotocol/inspector` 工具来检查 MCP 连接状态。

## 总结

通过以上步骤，普通Vue应用可以改造为 Electron 应用，且能成功接入 MCP 协议，实现与 AI 代理的深度集成。这使得用户可以通过自然语言与应用交互，执行各种业务操作，极大地提升了应用的智能化水平。
