# OpenTiny NEXT-SDKs: Built-in WebMCP & Polyfill + WebSkills + WebAgent

<p align="center">
  <a href="https://opentiny.design" target="_blank" rel="noopener noreferrer">
    <img alt="OpenTiny Logo" src="logo.svg" height="100" style="max-width:100%;">
  </a>
</p>

English | [简体中文](README.zh-CN.md)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/opentiny/webmcp-sdk)

<p align="center">
  <strong>A front-end intelligent application development and browser automation toolkit. It turns existing apps intelligent via WebMCP + WebSkills, and provides webmcp-cli to perceive and control any webpage with zero refactoring, giving them out-of-the-box AI-Native capabilities.</strong>
</p>

<p align="center">
  <a href="https://docs.opentiny.design/next-sdk/">📖 Docs</a> |
  <a href="#-quick-start">🚀 Quick Start</a> |
  <a href="#-webmcp--polyfill">🌐 WebMCP & Polyfill</a> |
  <a href="#-scenarios">💡 Scenarios</a>
</p>

> **Next-Gen AI Protocol**: OpenTiny NEXT-SDKs is built on the **WebMCP (Model Context Protocol for Web)**. It is fully compatible with the native `document.modelContext` API (currently in experimental stage in browsers like Chrome), allowing your web apps to be controlled by AI via a standardized protocol.

> [!TIP]
> **✨ Command-line Automation & AI Skills**:
> We now offer **`webmcp-cli`** (browser control & polyfill auto-injection CLI) and **`webmcp-skill`** (standard instructions and sub-skills like Excalidraw drawing for AI agents). Together, they enable AI agents to perform complex, fine-grained tasks and "remote-drive" any webpage out of the box.

---

**OpenTiny NEXT-SDKs** is a front-end intelligent application development and browser automation toolkit. Beyond enabling the "WebMCP + WebSkills" model to expose page operations as standardized tools in just a few lines of code, it features **`webmcp-cli`** (browser perception and control) and **`webmcp-skill`** (agent skills library). Combined with our **Polyfill**, not only can you build future-proof AI-Native apps in today's browsers, but you can also let AI agents automatically perceive and control any webpage with zero source code modifications.

## 📑 Table of Contents

- [✨ Main Features](#-main-features)
- [🌐 WebMCP & Polyfill](#-webmcp--polyfill)
- [🚀 Quick Start](#-quick-start)
- [📦 Core Packages](#-core-packages)
- [💻 WebMCP CLI & Agent Skills](#-webmcp-cli--agent-skills)
- [💡 Core Concepts](#-core-concepts)
- [📖 Scenarios](#-scenarios)
- [🛠️ Contributing](#️-contributing)
- [📄 License](#-license)

## ✨ Main Features

- 🔌 **Standard WebMCP Implementation**: Fully implements the browser version of the MCP protocol, making front-ends "AI-Callable" via a unified standard.
- 📡 **Remote AI Control**: Connect seamlessly to **WebAgent services**, allowing AI to easily and stably call your front-end tools remotely.
- 🛠️ **Built-in Polyfill Support**: Provides `document.modelContext` / `document.modelContext` patches for current browsers, ensuring today's code works seamlessly and transitions to native support in the future.
- 🎯 **Zero-Refactor Intelligence**: Expose business logic and UI operations as tools without changing your app's core architecture.
- 🧩 **WebSkills Abstraction**: Organizes tools into "Business Skills" for progressive disclosure.
- 🤖 **AI Chat Components**: Provides out-of-the-box `@opentiny/next-remoter` for an instant AI remote controller.

## 🌐 WebMCP & Polyfill

### What is WebMCP?

WebMCP is an extension of the Model Context Protocol specifically for web browsers. It defines how a web page provides "Tools" and "Resources" to AI agents. In the near future, browsers will provide a native `document.modelContext` object to manage these capabilities.

### Why Polyfill?

Since native APIs are still experimental, **OpenTiny NEXT-SDKs provides a powerful Polyfill**. By calling `initializeBuiltinWebMCP()`, the SDK will:

1.  **Injects `document.modelContext`**: Provides a standard-compliant API for tool registration. By default it **forces the JS polyfill** (`forcePolyfill: true`) over Chromium's experimental native implementation, which can crash the renderer on `getTools()`. Pass `{ forcePolyfill: false }` only when native WebMCP is confirmed stable.
2.  **Automated Routing & Bridging**: Automatically handles message synchronization and tool invocation across different page paths and iframes.

Call this at the page entry (or via `registerPageAgentTool()`) before registering tools or handing `document.modelContext` to an Agent.

### 📡 Cross-Page & Remote Control

One of the core highlights of OpenTiny NEXT-SDKs is its support for "cross-environment controllability" of pages. With the help of the built-in WebMCP Polyfill and `@opentiny/next-remoter`, you can achieve:

- **Automated Bridging**: The underlying layer automatically handles message synchronization and tool invocations across different page paths and iframes.
- **Persistent Session ID**: Establish long-term connections with cloud AI orchestrators.
- **Cross-time Collaboration**: Even if the user isn't actively interacting, AI can remotely trigger page tools based on instructions sent by the business system.
- **High-level Business Automation**: Converts front-end DOM operations and business component APIs into execution units in automated flows, achieving app-level "remote driving".

#### Connection Example

Through `WebMcpClient`, we can remotely call and control the built-in WebMCP tools of the browser via a cloud-based web-agent:

```typescript
import { WebMcpClient } from '@opentiny/next-sdk'

const client = new WebMcpClient()

// Connect to the WebAgent service
const { sessionId } = await client.connect({
  agent: true,
  builtin: true, // Enable built-in WebMCP proxy
  url: 'https://agent.opentiny.design/api/v1/webmcp-trial/mcp'
})

console.log('Connected! Session ID:', sessionId)
// Now your app can be controlled remotely via this sessionId
```

> [!TIP]
> The URL above is a public test server provided by OpenTiny for testing purposes. For production use, you should deploy your own WebAgent instance.
> Source code: [https://github.com/opentiny/web-agent](https://github.com/opentiny/web-agent)

## 🚀 Quick Start

Turn your front-end application into an AI-capable one in just a few lines of code.

### Step 1: Install Dependencies

```bash
npm install @opentiny/next-sdk
```

### Step 2: Initialize WebMCP Polyfill (Recommended)

Add this to your application's entry point (e.g., `main.ts` or `app.js`):

```typescript
import { initializeBuiltinWebMCP } from '@opentiny/next-sdk'

// Initialize Polyfill and Bridging Mechanism
initializeBuiltinWebMCP()
```

Now, you can use the standard `document.modelContext` anywhere in your app to register tools:

```typescript
// Register a tool that can be called by AI
const abortController = new AbortController()

document.modelContext.registerTool({
  name: 'get_user_info',
  description: 'Get current user information',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' }
    }
  },
  execute: async (args) => {
    // Write your business logic here
    return { content: [{ type: 'text', text: `Info for user ${args.userId}...` }] }
  }
}, { signal: abortController.signal })

// To unregister the tool when it's no longer needed, simply call abort()
// abortController.abort()
```

✅ **Done!** Your app is now an MCP Server.
You can connect it to any MCP-compatible client or use our [TinyRemoter](#-cross-page--remote-control) to chat with the app directly.

## 📦 Core Packages

### @opentiny/next-sdk (Current Package)

The core SDK package, providing:

- **Built-in WebMCP Polyfill**: Injects `document.modelContext` and sets up the bridging mechanism for seamless AI-to-page communication.
- **WebMcpServer**: Managed MCP server for full control over lifecycle and transport layers.
- **WebMcpClient**: MCP client for connecting to WebAgent or other remote services.
- **WebAgent**: High-level intelligent agent orchestration logic.
- **Transport Layer**: Support for MessageChannel, SSE, HTTP, and Chrome Extension messaging.

### @opentiny/next-remoter

Vue3 AI chat component based on TinyRobot, providing:

- Integrated AI assistant UI.
- MCP Plugin marketplace.
- Dynamic WebSkills discovery and execution.

### @opentiny/webmcp-cli

A CLI tool based on `puppeteer-core` used to control Chrome browsers and expose WebMCP interfaces:

- **Browser Takeover**: Automatically starts or connects to a local Chrome with debugging ports via Chrome DevTools Protocol (CDP).
- **Auto-Injection**: When browser tabs open, it detects and automatically injects the WebMCP polyfill and page manipulation tools (`page-agent-tool`).
- **Unified Tool Protocol**: Maps page operations to standard MCP interfaces, allowing AI agents to call them directly.

### webmcp-skill

Guidelines and domain-specific skills for third-party AI agents interacting with web pages:

- **Prompt Optimization**: Built-in comprehensive system prompts and usage specifications to assist external LLM agents in accurately using the CLI to control pages.
- **Domain-Specific Skills**: Provides sub-skills like Excalidraw canvas commands (`excalidraw_execute_command`) for high-difficulty granular web operations.

---

## 💻 WebMCP CLI & Agent Skills

With the WebMCP CLI, you can treat the browser as an MCP server, directly exposing page manipulation interfaces to AI Agents. Running Puppeteer in the background to drive a real Chrome browser, it maps traditional page interactions (click, input, scroll, etc.) into standard MCP Tool calls.

### 🚀 Getting Started

#### 1. Installation

You can install it globally via NPM:

```bash
npm install -g @opentiny/webmcp-cli
```

Or for local debugging within the current Monorepo:

```bash
cd packages/webmcp-cli
pnpm build
npm install -g .
```

#### 2. Open a Webpage

Navigate to a specific URL in Chrome and prepare the environment:

```bash
webmcp-cli tabs open https://excalidraw.com
```

#### 3. Get Browser State

View the current page state, including URL, title, open tabs, and **the list of automatically injected and native MCP tools**. It also returns an indexed DOM tree:

```bash
webmcp-cli state
```

The output will include elements like `[18]<button>Search</button>` with their index and the corresponding MCP interface names.

#### 4. Execute an MCP Tool

Use JSON-formatted arguments to directly execute registered MCP tools on the page:

```bash
# Click a button with DOM index 18
webmcp-cli run page-agent-tool '{"action": "click", "index": 18}'

# Fill text into an input field with DOM index 13
webmcp-cli run page-agent-tool '{"action": "fill", "index": 13, "text": "Model Context Protocol"}'
```

### 🧠 Agent Skill Guidelines

In the `packages/webmcp-skill` directory, we have defined a set of standard **Agent Skills**. When LLMs (like Claude or Gemini) connect to a webpage as an agent, they read `SKILL.md` to learn how to properly issue CLI commands.

For complex pages, we also pair them with domain-specific sub-skills:

- **Excalidraw Canvas Tools (`domains/excalidraw.md`)**: Instructs the Agent to use `excalidraw_execute_command` to draw shapes and diagrams when the URL contains `excalidraw.com`.
- **Baidu Search Tool**: Guides the Agent to automatically issue searches and pull page results.

This gives NEXT-SDKs a complete ecosystem enabling external AI to autonomously "remote drive" any webpage.

---

## 💡 Core Concepts

### WebMCP Bridge Architecture

Unlike traditional backend MCP, WebMCP focuses on the **Browser Context**.

```text
┌─────────────────────────────────────────────────────────────┐
│                       Web Browser                           │
│  ┌──────────────────┐              ┌───────────────────┐    │
│  │   Front-end App  │◄── Bridging ──►│   AI Assistant    │    │
│  │  (WebMCP Server) │   Mechanism    │   (MCP Client)    │    │
│  └──────────────────┘              └───────────────────┘    │
│           ▲                                  │              │
└───────────┼──────────────────────────────────┼──────────────┘
            │        (Standard Protocol)       │
            └──────────────────────────────────┘
```

1.  **Register Tools**: Use `document.modelContext.registerTool` to declare your app's capabilities, with support for automatic unregistration via `AbortSignal`.
2.  **Bridge Synchronization**: Our bridging mechanism automatically routes AI requests to the correct page or iframe, even if the user has switched pages.
3.  **Direct Execution**: Tools run directly in the page environment, allowing access to the DOM, component state, and local APIs.

### Underlying Transport and Engine Layer

Although you can simply use `document.modelContext.registerTool` for daily development, NEXT-SDKs retains the full core MCP protocol implementation internally for advanced scheduling:

- **WebMcpServer / WebMcpClient**: Responsible for handling underlying JSON-RPC messages, Schema validation, and channel handshakes. It is recommended to only understand these when expanding infrastructure; business apps should avoid calling them directly.

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
│   ├── webmcp-cli/            # CLI tool for browser control via WebMCP
│   │   ├── src/               # CLI main implementation
│   │   ├── webmcp-tools/      # Injected page tools (e.g. Excalidraw, Baidu)
│   │   ├── package.json
│   │   └── README.md
│   ├── webmcp-skill/          # Guidelines and domain-specific skills for AI agents
│   │   ├── SKILL.md           # Master instruction file for agents
│   │   └── domains/           # Domain-specific instructions (e.g., Excalidraw)
│   └── doc-ai/                # Doc AI example app
├── docs/                      # Project docs
├── pnpm-workspace.yaml        # pnpm workspace config
├── package.json
└── README.md
```

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
| **Vue**     | [doc-ai](packages/doc-ai)                 | Vue3 + Vite, best practices for local WebMCP / Polyfill mode                            |
| **Angular** | [doc-ai-angular](packages/doc-ai-angular) | Angular main app + iframe Remoter, connected to WebMCP via MessageChannel               |
| **React**   | [doc-ai-react](packages/doc-ai-react)     | React main app + iframe Remoter, similar WebMCP architecture to Vue version             |

Accompanying Documentation:

- [Vue Best Practice with WebMCP](docs/guide/vue-webmcp-best-practice.md)
- [Angular Best Practice with WebMCP](docs/guide/angular-webmcp-best-practice.md)

---

## 📄 License

[MIT](https://github.com/opentiny/next-sdk/blob/main/LICENSE)

Copyright (c) 2024-present OpenTiny Team

## 🙏 Acknowledgments

Thanks to all contributors to the OpenTiny NEXT-SDKs project!

[![contributors](https://contrib.rocks/image?repo=opentiny/next-sdk)](https://github.com/opentiny/next-sdk/graphs/contributors)
