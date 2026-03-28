# AGENTS.md

This file provides project-specific context, conventions, and instructions for AI coding agents to ensure high-quality, consistent contributions to the OpenTiny NEXT-SDKs project.

## Project Context

**OpenTiny NEXT-SDKs** is a frontend intelligent application development toolkit. It implements the **Model Context Protocol (MCP)** for web browsers, enabling developers to expose frontend functionality as MCP tools controlled by AI agents.

### Repository Architecture
- **Monorepo Manager**: pnpm workspaces
- **Core Package**: `@opentiny/next-sdk` (MCP server/client, transport, agents)
- **UI Package**: `@opentiny/next-remoter` (Vue3 chat component based on TinyRobot)
- **Extension**: `@opentiny/next-wxt` (Browser extension)
- **Examples**: `doc-ai`, `next-sdk-playground`, `vue-playground`

## AI Interaction Guidelines

1. **Language**: Use **Chinese (Simplified)** for thinking and responses as per user rules.
2. **Component Library**: 
   - Use **TinyVue** for general UI components.
   - Use **TinyRobot** for AI chat-related components.
   - Refer to `tiny-vue-skill` and `tiny-robot-skill` for detailed API and coding standards.
3. **Tech Stack**: 
   - Framework: Vue 3 (Composition API) / Next.js
   - Language: TypeScript (Strict mode)
   - Styling: Vanilla CSS (unless Tailwind is requested)
   - Build Tool: Vite

## Development Workflow

### Commands
- **Install**: `pnpm install`
- **Build Core**: `pnpm build`
- **Dev (Doc AI)**: `pnpm dev`
- **Dev (Extension)**: `pnpm dev:wxt`
- **Dev (Remoter)**: `pnpm dev:remoter`

### Path Resolution
- Components: `packages/next-remoter/src/components`
- Core Logic: `packages/next-sdk/src`
- Transport: `packages/next-sdk/transport`

## Coding Standards

- **Type Safety**: Avoid `any`. Use interfaces and types for all data structures.
- **Naming**: 
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Functions/Variables: `camelCase`
- **Logic Placement**: 
  - Keep UI components thin; move complex logic to composables (`use*.ts`) or core SDK classes.
  - Follow the MCP specification for tool and resource definitions.
- **Styling**: Prioritize rich aesthetics, glassmorphism, and smooth animations in UI components.

## Knowledge Sources

- **CLAUDE.md**: High-level overview and common commands.
- **README.md**: User-facing documentation.
- **Skills**: Check `.agents/skills/` for library-specific instructions.

---
*Note: This file is intended for AI agents. For human-readable documentation, see README.md.*
