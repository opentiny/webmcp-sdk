# OpenTiny NEXT-SDKs: Built-in WebMCP & Polyfill + WebSkills + WebAgent

English | [简体中文](README.zh-CN.md)

<p align="center">
  <strong>A toolkit for front-end intelligent application development. With the Built-in WebMCP protocol, transform your applications into AI-Native ones instantly.</strong>
</p>

<p align="center">
  <a href="https://docs.opentiny.design/next-sdk/">📖 Docs</a> |
  <a href="#-quick-start">🚀 Quick Start</a> |
  <a href="#-webmcp--polyfill">🌐 WebMCP & Polyfill</a> |
  <a href="#-scenarios">💡 Scenarios</a>
</p>

> [!IMPORTANT]
> **Next-Gen AI Protocol**: OpenTiny NEXT-SDKs is built on the **WebMCP (Model Context Protocol for Web)**. It is fully compatible with the native `navigator.modelContext` API (currently in experimental stage in browsers like Chrome), allowing your web apps to be controlled by AI via a standardized protocol.

---

**OpenTiny NEXT-SDKs** is a front-end intelligent application development toolkit. It enables the "WebMCP + WebSkills" model to expose page operations, data queries, and business processes as standardized tools. By using our **Polyfill**, you can start building future-proof AI-Native applications on today's browsers with **zero refactoring**.

## 📑 Table of Contents

- [✨ Main Features](#-main-features)
- [🌐 WebMCP & Polyfill](#-webmcp--polyfill)
- [🚀 Quick Start](#-quick-start)
- [📦 Core Packages Description](#-core-packages-description)
- [💡 Core Concepts](#-core-concepts)
- [📖 Scenarios](#-scenarios)
- [🛠️ Contributing](#️-contributing)
- [📄 License](#-license)

## ✨ Main Features

- 🔌 **Standard WebMCP Implementation**: Fully implements the browser version of MCP, making front-ends "AI-Callable" via a unified protocol.
- 📡 **Remote AI Control**: Seamlessly connect your front-end to a **WebAgent service**, allowing AI to remotely orchestrate and control your application via a stable sessionId.
- 🛠️ **Built-in Polyfill Support**: Provides `navigator.modelContext` polyfill for current browsers, ensuring your code works today and is ready for tomorrow's native browser support.
- 🎯 **Zero-Refactor Intelligence**: Expose existing business logic and UI operations as tools without changing your app's core architecture.
- 🧩 **WebSkills Abstraction**: Organizes tools into "Business Skills" for progressive disclosure to AI.
- 🤖 **AI Chat Components**: Ready-to-use `@opentiny/next-remoter` for instant AI remote control.

## 🌐 WebMCP & Polyfill

### What is WebMCP?

WebMCP is an extension of the Model Context Protocol specifically for web browsers. It defines how a web page provides "Tools" and "Resources" to AI agents. In the near future, browsers will provide a native `navigator.modelContext` object to manage these capabilities.

### Why Polyfill?

Since the native API is still in its experimental phase, **OpenTiny NEXT-SDKs provides a robust Polyfill**. By calling `initializeBuiltinWebMCP()`, the SDK:

1.  **Injects `navigator.modelContext`**: Provides a standard-compliant API for tool registration.
2.  **Automatic Routing & Bridge**: Automatically handles page navigation and message synchronization across different routes/iframes.

This means you can write standard WebMCP code today, and it will automatically switch to the native engine when the browser supports it.

### 📡 Remote Control via WebAgent

One of the most powerful features of NEXT-SDKs is the ability to connect your local page tools to a remote **WebAgent**. By using the `WebMcpClient`, you can:

- **Obtain a Session ID**: Establish a persistent connection to the cloud-based AI orchestrator.
- **Remote Orchestration**: Allow the AI to call your page's tools even when you are not actively interacting with the chat UI.
- **Cross-Device Control**: Once connected, your application can be controlled from any authorized MCP client using its `sessionId`.

#### Connection Example

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient()

// Connect to the remote WebAgent service
const { sessionId } = await client.connect({
  agent: true,
  builtin: true, // Enable the built-in WebMCP proxy
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})

console.log('Connected! Session ID:', sessionId)
// Now your app can be controlled remotely via this sessionId
```

> [!TIP]
> The URL above is a public test server provided by OpenTiny for testing purposes. For production use, you should deploy your own WebAgent instance.
> Source code: [https://github.com/opentiny/web-agent](https://github.com/opentiny/web-agent)

## 🚀 Quick Start

Turn your front-end application into an AI-Native one in just a few lines.

### Step 1: Install Dependencies

```bash
npm install @opentiny/next-sdk
```

### Step 2: Initialize WebMCP Polyfill (Recommended)

Add this at your application's entry point (e.g., `main.ts` or `app.js`).

```typescript
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

// Initialize Polyfill and Bridge
initializeBuiltinWebMCP()
```

### Step 3: Register Tools via Standard API

Now you can use the standard `navigator.modelContext` to register tools anywhere in your app:

```typescript
// Register a tool that AI can call
navigator.modelContext.registerTool({
  name: 'get_user_info',
  description: 'Get current user profile',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' }
    }
  },
  handler: async (args) => {
    // Your business logic here
    return { content: [{ type: 'text', text: `Info for user ${args.userId}` }] }
  }
})
```

✅ **Done!** Your app is now an MCP Server. You can connect it to any MCP-compatible client or usage our [TinyRemoter](#-add-ai-remote-controller) to start chatting with your app.

---

## 📦 Core Packages Description

### @opentiny/next-sdk (Current Package)

Core SDK package, providing:

- **Built-in WebMCP Polyfill**: Injects `navigator.modelContext` and sets up the bridge for seamless AI-to-Page communication.
- **WebMcpServer**: Managed MCP server for full control over lifecycle and transports.
- **WebMcpClient**: MCP client for connecting to WebAgents and other services.
- **WebAgent**: High-level agent orchestration logic.
- **Transport Layer**: Support for MessageChannel, SSE, HTTP, and Chrome Extension messaging.

### @opentiny/next-remoter

Vue3 AI chat component based on TinyRobot, offering:

- Integrated AI assistant UI.
- MCP Plugin marketplace.
- Dynamic WebSkills discovery and execution.

---

## 💡 Core Concepts

### The WebMCP Bridge Architecture

Unlike traditional backend MCP, WebMCP focuses on the **Browser Context**.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Web Browser                           │
│  ┌──────────────────┐              ┌───────────────────┐    │
│  │  Front-end App   │◄── Bridge ──►│   AI Assistant    │    │
│  │ (WebMCP Server)  │              │   (MCP Client)    │    │
│  └──────────────────┘              └───────────────────┘    │
│           ▲                                  │              │
└───────────┼──────────────────────────────────┼──────────────┘
            │          (Standard Protocol)      │
            └──────────────────────────────────┘
```

1.  **Registering**: Use `navigator.modelContext.registerTool` to declare what your app can do.
2.  **Bridging**: Our Bridge automatically routes AI requests to the correct page/iframe, even if the user has navigated away.
3.  **Executing**: Tools run in the context of your page, allowing direct access to DOM, State, and APIs.

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
