# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenTiny NEXT-SDKs is a frontend intelligent application development toolkit that implements the Model Context Protocol (MCP) for web browsers. It allows developers to quickly add AI capabilities to web applications by exposing frontend functionality as MCP tools that can be controlled by AI agents.

## Monorepo Structure

This is a pnpm workspace monorepo with packages in `packages/`:

- **@opentiny/next-sdk** - Core SDK implementing WebMcpServer, WebMcpClient, transport layer, and AI agent utilities
- **@opentiny/next-remoter** - Vue3 AI chat component built on @opentiny/tiny-robot
- **@opentiny/next-wxt** - Browser extension implementation using WXT framework
- **doc-ai** - Document AI example application
- **next-sdk-playground** - Next.js demonstration
- **vue-playground** - Vue UI playground demonstrating multiple chat UI integrations (MateChat, Ant Design Vue X, Element Plus X, TDesign Chat)
- **next-docs** - VitePress documentation site

## Common Development Commands

### Installation
```bash
pnpm install  # Use pnpm (not npm or yarn)
```

### Development
```bash
pnpm dev                  # Start doc-ai example
pnpm dev:wxt              # Start browser extension
pnpm dev:remoter          # Start next-remoter component dev server
pnpm dev:vue-playground   # Start Vue playground
pnpm dev:playground       # Start Next.js playground
pnpm wiki                 # Start VitePress documentation
```

### Building
```bash
pnpm build                # Build @opentiny/next-sdk (all variants)
pnpm build:remoter        # Build next-remoter
pnpm build:wxt           # Build browser extension
```

### Publishing
```bash
pnpm pub:next-sdk         # Publish @opentiny/next-sdk to npm
pnpm pub:remoter          # Publish @opentiny/next-remoter to npm
```

### MCP Inspector
```bash
npx @modelcontextprotocol/inspector  # Debug MCP connections
```

## Core Architecture

### MCP Protocol Implementation

The project implements Model Context Protocol for browser environments with two key components:

1. **WebMcpServer** (`packages/next-sdk/WebMcpServer.ts`) - Registers frontend application capabilities as MCP tools. Applications expose their functionality (e.g., data queries, UI operations) through tool registration.

2. **WebMcpClient** (`packages/next-sdk/WebMcpClient.ts`) - Connects to WebAgent services and other MCP servers. It acts as the bridge between the frontend and AI agents.

3. **Transport Layer** (`packages/next-sdk/transport/`) - Multiple communication methods:
   - `MessageChannelTransport` - Same-origin browser window communication
   - `SSETransport` - Server-Sent Events for server push
   - `HttpTransport` - Standard HTTP requests

### Communication Flow

```
Frontend App ↔ WebMcpServer ↔ WebMcpClient ↔ WebAgent Service ↔ AI LLM
                          ↓
                    TinyRemoter (UI)
```

1. WebMcpServer registers tools in the frontend app
2. WebMcpClient connects to WebAgent service to get sessionId
3. WebAgent acts as hub connecting AI models and MCP tools
4. TinyRemoter provides user interface for natural language interaction
5. AI calls MCP tools based on user intent

### Key Modules in @opentiny/next-sdk

- `agent/` - AI agent utilities and integrations
- `remoter/` - Remote control utilities
- `transport/` - Transport layer implementations
- `McpSdk.ts` - MCP SDK wrapper
- `index.ts` - Main entry point

### Build Variants for Core SDK

The core SDK provides modular builds for different use cases:

- `build:all` - Production + development builds with source maps
- `build:cdn` - CDN-optimized production builds
- `build:webAgent` - WebAgent module
- `build:webMcp` - WebMCP module
- `build:mcpSdk` - MCP SDK module
- `build:zod` - Zod validation module
- `build:webMcpFull` - WebMCP complete version

Each has a `:dev` variant with source maps for debugging.

## Environment Requirements

- Node.js >= 16
- pnpm >= 8.0.0
- Git latest version

## Code Standards

- **TypeScript** - All code must be TypeScript with strict typing
- **File naming** - kebab-case (e.g., `web-mcp-client.ts`)
- **Class naming** - PascalCase (e.g., `WebMcpClient`)
- **Function naming** - camelCase (e.g., `registerTool`)
- **Constants** - UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Comments** - Add clear Chinese comments for complex logic

## Commit Convention

Follow Conventional Commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `perf:` - Performance optimizations
- `test:` - Test additions/changes
- `build:` - Build configuration changes
- `ci:` - CI/CD changes

## Dependencies

Key dependencies managed via pnpm catalog:

- AI SDK: OpenAI, DeepSeek, provider utilities
- MCP SDK: @modelcontextprotocol/sdk
- Vue 3: OpenTiny Vue, TinyRobot
- Build: Vite, TypeScript, unplugin-auto-import
- Validation: Zod, ajv
- QR Code: qrcode, html5-qrcode
