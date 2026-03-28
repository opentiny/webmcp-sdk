# OpenTiny NEXT-SDKs

English | [简体中文](README.zh-CN.md)

<p align="center">
  <strong>A toolkit for front-end intelligent application development, making your applications AI-capable instantly. With WebMCP + WebSkills, transform "existing business applications" into intelligent ones in just a few lines of code.</strong>
</p>

<p align="center">
  <a href="https://docs.opentiny.design/next-sdk/">📖 Docs</a> |
  <a href="#-quick-start">🚀 Quick Start</a> |
  <a href="#-scenarios">💡 Scenarios</a> |
  <a href="#️-contributing">🛠️ Contributing</a>
</p>

> [!IMPORTANT]
> **WebMCP Compatibility Note**: The OpenTiny WebMCP solution is **fully compatible with the built-in WebMCP protocol in Google Chrome as defined by Google**. This means the WebSkills you develop with this SDK can seamlessly integrate with the browser's native AI capabilities.

---

**OpenTiny NEXT-SDKs** is a front-end intelligent application development toolkit based on the Web version of the MCP protocol. Through the "WebMCP + WebSkills" model, it encapsulates page operations, data queries, and business processes in your existing front-end/business systems into tools that can be called by AI, allowing legacy applications to quickly access intelligent capabilities with **almost zero refactoring**.

## 📑 Table of Contents

- [✨ Main Features](#-main-features)
- [📦 Core Packages Description](#-core-packages-description)
- [🚀 Quick Start](#-quick-start)
- [🌐 Browser Direct Import](#-browser-direct-import)
- [💡 Core Concepts](#-core-concepts)
- [📖 Scenarios](#-scenarios)
- [🛠️ Contributing](#️-contributing)
- [📚 Related Resources](#-related-resources)
- [WebMCP + WebSkills Best Practice Projects](#webmcp--webskills-best-practice-projects)
- [❓ FAQ](#-faq)
- [📄 License](#-license)

## ✨ Main Features

- 🎯 **Legacy App Intelligence First**: Oriented towards "existing systems", exposing existing APIs, page operations, and business processes to AI through WebMCP + WebSkills without large-scale refactoring.
- 🔌 **WebMCP Protocol Implementation**: Fully implements the browser version of Model Context Protocol (MCP), **fully compatible with Google Chrome's built-in WebMCP protocol**, allowing front-ends to be called by AI just like "back-end tool services".
- 🧩 **WebSkills Abstraction**: Organizes and registers tools as "Business Skills (WebSkills)". One set of capabilities can serve both AI chat and automation flows.
- 🤖 **AI Chat Components**: Provides out-of-the-box AI chat components (`@opentiny/next-remoter`). Chatting is remote-controlling your business system.
- 🔄 **Adapter Layer**: Quickly connects any front-end AI chat component to WebAgent / WebMCP services.
- 🌐 **Multi-modal Support**: Supports text, voice, and other multi-modal inputs, smoothing out differences between different LLMs.
- 📱 **QR Code Function**: Dynamically generates QR codes, allowing enterprise application MCP services to quickly connect to AI chat boxes.
- 🎪 **Remote Control Mode**: Provides PC and mobile remote controllers to control front-end applications through conversation.

## 📦 Core Packages Description

### @opentiny/next-sdk (Current Package)

Core SDK package, providing:

- **WebMcpServer**: MCP server implementation, declaring front-end functions as MCP tools (container for WebSkills).
- **WebMcpClient**: MCP client implementation, connecting to WebAgent and other MCP services.
- **WebAgent**: Core logic for front-end intelligent agents.
- **McpSdk**: MCP SDK encapsulation.
- **Transport Layer**: Supports multiple communication methods (MessageChannel, SSE, HTTP, etc.).
- **Utility Functions and Type Definitions**: Full TypeScript type support.

### @opentiny/next-remoter

Vue3 AI chat component based on `@opentiny/tiny-robot`, providing:

- Full AI chat interface
- MCP plugin market
- Scan-to-add application function
- Multi-model switching support
- Generative UI rendering

See: [@opentiny/next-remoter Docs](packages/next-remoter/README.md)

## 🚀 Quick Start

Using OpenTiny NEXT-SDKs, you only need four steps to turn your front-end/business application into an intelligent application that can be controlled by AI through WebMCP + WebSkills:

### Step 1: Install Dependencies

```bash
npm install @opentiny/next-sdk
```

### Step 2: Create MCP Server and Register Tools

```typescript
import { WebMcpServer, createMessageChannelPairTransport, z } from '@opentiny/next-sdk'

// Create communication channel
const [serverTransport, clientTransport] = createMessageChannelPairTransport()

// Create MCP Server
const server = new WebMcpServer({
  name: 'my-app-server',
  version: '1.0.0'
})

// Register tool
server.registerTool(
  'demo-tool',
  {
    title: 'Demo Tool',
    description: 'This is a demo tool',
    inputSchema: {
      foo: z.string().describe('Input parameter')
    }
  },
  async (params) => {
    console.log('Received parameters:', params)
    return {
      content: [
        {
          type: 'text',
          text: `Processed: ${params.foo}`
        }
      ]
    }
  }
)

// Connect Server Transport
await server.connect(serverTransport)
```

### Step 3: Create MCP Client and Connect to WebAgent

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

// Create MCP Client
const client = new WebMcpClient({
  name: 'my-app-client',
  version: '1.0.0'
})

// Connect Client Transport
await client.connect(clientTransport)

// Connect to WebAgent service
const { sessionId } = await client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})

console.log('Obtained sessionId:', sessionId)
```

✅ Done! Now your front-end application has become an intelligent application and can be controlled by AI.

You can control intelligent applications through various [MCP Hosts](https://modelcontextprotocol.io/clients).

### Step 4: Add AI Remote Controller (Optional)

We provide an out-of-the-box AI chat component that supports both PC and mobile, acting like a remote control to operate your front-end application through conversation.

#### Install Remote Controller Component

```bash
npm install @opentiny/next-remoter
```

#### Use in Vue Project and Connect WebSkills Docs

The following example demonstrates how TinyRemoter connects to WebSkills documents through the `skills` attribute to achieve **progressive disclosure** of business capabilities. **For complete projects and best practices for each framework, please refer directly to the example projects in the repository** (see [WebMCP + WebSkills Best Practice Projects](#webmcp--webskills-best-practice-projects) below).

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { TinyRemoter } from '@opentiny/next-remoter'
import { createMcpServer, clientTransport } from './mcp-servers'

// 1. Load local skill documents (Markdown) at once via Vite's import.meta.glob
// Each skill.md corresponds to a business capability description + tool usage specification
const skillMdModules = import.meta.glob('./skills/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

// 2. Declare local WebMCP Server, providing business tools (base toolset for WebSkills)
const mcpServers = {
  'ecommerce-mcp-server': {
    type: 'local' as const,
    transport: clientTransport
  }
}

// 3. Start local WebMCP Server when mounting the component
onMounted(async () => {
  await createMcpServer()
})
</script>

<template>
  <!-- Pass WebSkills docs via skills for progressive disclosure; bind local WebMCP via mcpServers to expose business tools -->
  <tiny-remoter class="remoter-pane" :skills="skillMdModules" :mcpServers="mcpServers" title="My AI Assistant" />
</template>
```

#### Remote Controller Features

The remote controller will display an icon in the bottom right corner of your application. Hover over it to select:

- 💬 **Pop-up AI Chat Box**: Open the AI chat interface on the side of the application.
- 📱 **Show QR Code**: Open the mobile remote controller after scanning with a phone.

Whether on PC or mobile, you can use natural language to let AI help you operate the application, greatly improving work efficiency!

## 🌐 Browser Direct Import

You can also import NEXT-SDKs directly through browser HTML tags, allowing you to use the global variable `WebMCP`.

```html
<html>
  <head>
    <!-- Import NEXT-SDKs -->
    <script src="https://unpkg.com/@opentiny/next-sdk@0.1/dist/index.umd.js"></script>
  </head>
  <body>
    <script>
      ;(async () => {
        const { WebMcpServer, createMessageChannelPairTransport, z, WebMcpClient } = WebMCP
        const [serverTransport, clientTransport] = createMessageChannelPairTransport()

        const client = new WebMcpClient()
        await client.connect(clientTransport)
        const { sessionId } = await client.connect({
          agent: true,
          url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
        })

        const server = new WebMcpServer()
        server.registerTool(
          'demo-tool',
          {
            title: 'Demo Tool',
            description: 'A simple tool',
            inputSchema: { foo: z.string() }
          },
          async (params) => {
            console.log('params:', params)
            return { content: [{ type: 'text', text: `Received: ${params.foo}` }] }
          }
        )

        await server.connect(serverTransport)
      })()
    </script>
  </body>
</html>
```

## 💡 Core Concepts

### Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       Front-end App                         │
│  ┌──────────────────┐              ┌───────────────────┐   │
│  │  WebMcpServer    │◄────────────►│  WebMcpClient     │   │
│  │  (Register Tools)│  MessageChannel │ (Connect Agent)   │   │
│  └──────────────────┘              └───────────────────┘   │
│           ▲                                  │              │
└───────────┼──────────────────────────────────┼──────────────┘
            │                                  │
            │                                  ▼
            │                         ┌─────────────────┐
            │                         │  WebAgent Service │
            │                         │ (AI + MCP Hub)   │
            │                         └─────────────────┘
            │                                  │
            │                                  ▼
            │                         ┌─────────────────┐
            └─────────────────────────┤  TinyRemoter    │
                                      │ (AI Remote)     │
                                      └─────────────────┘
```

**Workflow:**

1. **WebMcpServer** registers available tools in the front-end app (e.g., querying data, UI operations, etc.).
2. **WebMcpClient** connects to the **WebAgent Service** and obtains a sessionId.
3. **WebAgent** acts as a hub, connecting AI LLMs and various MCP tools.
4. **TinyRemoter** provides the user interface, where users control the app through natural language.
5. AI calls corresponding MCP tools according to user intent.

### WebMcpServer

WebMcpServer is the MCP server implementation used to declare front-end application functions as MCP tools.

```typescript
import { WebMcpServer } from '@opentiny/next-sdk'

const server = new WebMcpServer({
  name: 'my-app',
  version: '1.0.0'
})

// Register tool
server.registerTool(
  'tool-name',
  {
    title: 'Tool Title',
    description: 'Tool Description',
    inputSchema: {
      /* Zod schema */
    }
  },
  async (params) => {
    // Tool logic
    return { content: [{ type: 'text', text: 'Result' }] }
  }
)
```

### WebMcpClient

WebMcpClient is the MCP client implementation used to connect to WebAgent services and other MCP services.

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient({
  name: 'my-client',
  version: '1.0.0'
})

// Connect to WebAgent
const { sessionId } = await client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})
```

### Transport Layer

NEXT-SDKs supports multiple communication methods:

- **MessageChannel**: Cross-window communication within the browser.
- **SSE**: Server-Sent Events.
- **HTTP**: Standard HTTP requests.

```typescript
import { createMessageChannelPairTransport } from '@opentiny/next-sdk'

// Create MessageChannel transport pair
const [serverTransport, clientTransport] = createMessageChannelPairTransport()
```

## 📖 Scenarios

- **🤝 Smart Customer Service**: Quickly build an AI customer service system that supports tool calls.
- **📚 Doc Assistant**: Add intelligent Q&A functionality to documentation websites.
- **🛠️ Dev Tools**: Build developer auxiliary tools that support code generation and analysis.
- **🌐 Browser Extensions**: Develop browser plugins with AI capabilities.
- **🏢 Enterprise Apps**: Add intelligent capabilities to enterprise applications.
- **📊 Data Analysis**: Build intelligent data analysis and visualization applications.
- **✍️ Content Creation**: Develop AI-assisted content creation tools.

## 🛠️ Contributing

We welcome all forms of contribution! Whether it's reporting bugs, suggesting new features, improving documentation, or submitting code, we appreciate it.

### Prerequisites

Before you start developing, please make sure your environment meets the following requirements:

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git** Latest version

### Get the Code

```bash
# Clone the repository
git clone https://github.com/opentiny/next-sdk.git
cd next-sdk

# Install dependencies
pnpm install
```

### Project Structure

```text
next-sdk/
├── packages/
│   ├── next-sdk/              # Core SDK package
│   │   ├── agent/             # WebAgent implementation
│   │   ├── client/            # WebMCP client
│   │   ├── server/            # WebMCP server
│   │   ├── transport/         # Transport layer implementation
│   │   ├── McpSdk.ts          # MCP SDK encapsulation
│   │   ├── index.ts           # Main entry
│   │   ├── package.json
│   │   └── README.md
│   ├── next-remoter/          # Vue3 AI Chat Component
│   │   ├── src/
│   │   │   ├── components/    # Component implementation
│   │   │   └── composable/    # Composables
│   │   ├── package.json
│   │   └── README.md
│   └── doc-ai/                # Doc AI example app
├── docs/                      # Project docs
├── pnpm-workspace.yaml        # pnpm workspace config
├── package.json
└── README.md
```

### Development Flow

#### 1. Develop Core SDK

```bash
# Enter next-sdk package directory
cd packages/next-sdk

# Dev mode (supports hot reloading)
pnpm dev

# Run tests
pnpm test

# Build project
pnpm build
```

#### 2. Develop Remoter Component

```bash
# Enter next-remoter package directory
cd packages/next-remoter

# Start dev server
pnpm dev

# Browser access http://localhost:5173
```

#### 3. Debug Example App

```bash
# Enter doc-ai example directory
cd packages/doc-ai

# Start dev server
pnpm dev
```

### Build Script Description

The core SDK provides multiple build scripts:

```bash
# Build all versions (production + dev)
pnpm build:all

# Build production version only
pnpm build:cdn

# Build dev version (includes source maps)
pnpm build:cdn:dev

# Build specific module
pnpm build:webAgent       # WebAgent module
pnpm build:webMcp         # WebMCP module
pnpm build:mcpSdk         # MCP SDK module
pnpm build:zod            # Zod validation module
pnpm build:webMcpFull     # WebMCP full version
```

### Code Convention

Before submitting code, please ensure it complies with the following conventions:

- **TypeScript**: Write type-safe code using TypeScript.
- **Code Style**: Follow the project's ESLint configuration.
- **Naming Convention**:
  - Filenames: use kebab-case (e.g., `web-mcp-client.ts`).
  - Class names: use PascalCase (e.g., `WebMcpClient`).
  - Function names: use camelCase (e.g., `registerTool`).
  - Constants: use UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`).
- **Comments**: Add clear English comments for key logic.
- **Testing**: Add unit tests for new features.

### Submit Code

#### 1. Create Branch

```bash
# Create feature branch based on main branch
git checkout -b feature/your-feature-name

# Or create fix branch
git checkout -b fix/your-bug-fix
```

#### 2. Commit Convention

We use the Conventional Commits specification:

```bash
# New feature
git commit -m "feat: Add XXX feature"

# Bug fix
git commit -m "fix: Fix XXX issue"

# Doc update
git commit -m "docs: Update XXX docs"

# Refactoring
git commit -m "refactor: Refactor XXX module"

# Performance optimization
git commit -m "perf: Optimize XXX performance"

# Testing related
git commit -m "test: Add XXX tests"

# Build related
git commit -m "build: Update build config"

# CI related
git commit -m "ci: Update CI config"
```

#### 3. Push and Create PR

```bash
# Push to remote branch
git push origin feature/your-feature-name

# Create Pull Request on GitHub
# Fill in the PR description, explaining changes and reasons
```

### Release Process

> Note: Release requires maintainer permissions.

```bash
# 1. Update version number
# Edit the version field in packages/next-sdk/package.json

# 2. Update CHANGELOG
# Record major changes in this release

# 3. Build project
pnpm build:all

# 4. Publish to npm
cd packages/next-sdk
npm publish

# Or publish next-remoter
cd packages/next-remoter
npm publish
```

### Report Issues

If you find a Bug or have feature suggestions, please feedback through:

1. Visit [GitHub Issues](https://github.com/opentiny/next-sdk/issues)
2. Click "New Issue"
3. Select appropriate Issue template
4. Fill in detailed description:
   - **Bug Report**: including reproduction steps, expected behavior, actual behavior, environment info, etc.
   - **Feature Suggestion**: explain requirement background, desired functionality, scenarios, etc.

### Join Discussions

- Join [OpenTiny Community](https://github.com/opentiny/next-sdk/discussions)
- Follow [OpenTiny Official Site](https://opentiny.design)
- Participate in technical discussions in Issues
- Help answer other developers' questions

## 📚 Related Resources

### Official Docs

- [OpenTiny NEXT-SDKs Official Docs](https://docs.opentiny.design/next-sdk/)
- [TinyRobot Remoter Component Docs](https://docs.opentiny.design/next-sdk/guide/tiny-robot-remoter.html)
- [API Reference](https://docs.opentiny.design/next-sdk/api/)

### Related Projects

- [OpenTiny](https://github.com/opentiny) - OpenTiny Organization Homepage
- [TinyVue](https://github.com/opentiny/tiny-vue) - Enterprise Vue Component Library
- [TinyEngine](https://github.com/opentiny/tiny-engine) - Low-code Engine
- [TinyRobot](https://github.com/opentiny/tiny-robot) - AI Chat Component

### WebMCP + WebSkills Best Practice Projects

It is recommended to refer directly to the following example projects, clone or implement them according to your tech stack:

| Tech Stack  | Example Project                           | Description                                                                             |
| ----------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| **Vue**     | [doc-ai](packages/doc-ai)                 | Vue3 + Vite, local WebMCP Server, skills docs (Markdown) and TinyRemoter integration    |
| **Angular** | [doc-ai-angular](packages/doc-ai-angular) | Angular main app + iframe Remoter, connected to WebMCP via MessageChannel               |
| **React**   | [doc-ai-react](packages/doc-ai-react)     | React main app + iframe Remoter, similar WebMCP + WebSkills architecture to Vue version |

Accompanying Documentation:

- [Vue Best Practice with WebMCP](docs/guide/vue-webmcp-best-practice.md)
- [Angular Best Practice with WebMCP](docs/guide/angular-webmcp-best-practice.md)

### Other Example Projects

- [next-wxt](packages/next-wxt) - Browser extension example (WXT framework)

### MCP Protocol

- [Model Context Protocol Official Docs](https://modelcontextprotocol.io/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)

### External Links

- [GitHub Repository](https://github.com/opentiny/next-sdk)
- [NPM Package - @opentiny/next-sdk](https://www.npmjs.com/package/@opentiny/next-sdk)
- [NPM Package - @opentiny/next-remoter](https://www.npmjs.com/package/@opentiny/next-remoter)
- [Feedback](https://github.com/opentiny/next-sdk/issues)
- [Contribution Guide](https://github.com/opentiny/next-sdk/blob/main/CONTRIBUTING.md)

## ❓ FAQ

### 1. How to obtain sessionId?

Automatically obtained after WebMcpClient connects to WebAgent service:

```typescript
const { sessionId } = await client.connect({
  agent: true,
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})
```

### 2. How to customize MCP tools?

Use `server.registerTool()` to register custom tools:

```typescript
server.registerTool(
  'my-tool',
  {
    title: 'My Tool',
    description: 'Tool description',
    inputSchema: {
      param1: z.string(),
      param2: z.number()
    }
  },
  async (params) => {
    // Implement tool logic
    return { content: [{ type: 'text', text: 'Execution result' }] }
  }
)
```

### 3. Which LLMs are supported?

NEXT-SDKs supports all LLMs compatible with AI SDK, including:

- OpenAI (GPT-4, GPT-3.5, etc.)
- DeepSeek
- Anthropic Claude
- Qwen
- ERNIE Bot
- Other custom models

### 4. How to handle CORS issues?

WebMCP uses MessageChannel for cross-window communication, which is not restricted by browser CORS. If connecting to a remote MCP service, the server needs to correctly configure CORS.

### 5. Can it be used in React projects?

Yes! The core functionality of NEXT-SDKs is framework-agnostic. Although `@opentiny/next-remoter` is a Vue3 component, you can:

- Use the core SDK directly (`@opentiny/next-sdk`)
- Develop React versions of chat components based on the core SDK
- Use browser direct import

## 📄 License

[MIT](https://github.com/opentiny/next-sdk/blob/main/LICENSE)

Copyright (c) 2024-present OpenTiny Team

## 🙏 Acknowledgments

Thanks to all contributors to the OpenTiny NEXT-SDKs project!

[![contributors](https://contrib.rocks/image?repo=opentiny/next-sdk)](https://github.com/opentiny/next-sdk/graphs/contributors)

---

If you have any questions or suggestions, please submit an [Issue](https://github.com/opentiny/next-sdk/issues) or [Pull Request](https://github.com/opentiny/next-sdk/pulls).
