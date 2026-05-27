---
name: webmcp-skill
description: Instructions and guidelines for third-party AI agents on how to install and execute webmcp-cli commands to interact with browser pages. Includes domain-specific tool guides for pages with injected WebMCP tools.
license: MIT
metadata:
  author: opentiny
  version: '1.1.0'
---

# WebMCP CLI Skill

This skill provides comprehensive instructions for third-party AI agents on how to use `webmcp-cli` to interact with browser pages. `webmcp-cli` bridges the AI agent to an actual browser using Model Context Protocol (MCP).

## When to use

- When you need to interact with a web page dynamically (e.g., clicking elements, filling forms).
- When you need to read the current DOM structure, specifically identifying interactive elements on the page.
- When evaluating the result of a browser interaction.
- When operating on pages with domain-specific injected tools (e.g., Excalidraw, Baidu).

## Installation

**Local Monorepo:**
```bash
cd packages/webmcp-cli && pnpm link --global
```

**NPM Installation (When published):**
```bash
npm install -g @opentiny/webmcp-cli
```

## How to use `webmcp-cli`

### Workspace Configuration
By default, the CLI uses a persistent profile at `~/.webmcp_chrome_profile`.
```bash
webmcp-cli --workspace /path/to/custom/profile state
# Or
WEBMCP_WORKSPACE=/path/to/profile webmcp-cli state
```

---

### 1. `webmcp-cli open <url>`

**Description:** Opens a URL in the browser and injects the WebMCP polyfill + any domain-specific tools.

```bash
webmcp-cli open https://excalidraw.com
```

After opening, domain-specific tools will be automatically injected based on the URL hostname.

---

### 2. `webmcp-cli state`

**Description:** Retrieves the current state of the browser — URL, title, interactive elements, and available tools.

```bash
webmcp-cli state
# Specify a tab by its real Chrome target ID:
webmcp-cli state -t <targetId>
```

**Example Output:**
```json
{
  "content": "[0]<a>新闻 />\n[13]<textarea placeholder=搜索 id=chat-textarea />\n[18]<button>百度一下</button>",
  "url": "https://www.baidu.com/",
  "title": "百度一下，你就知道",
  "webmcpTools": [
    { "name": "page-agent-tool", "description": "..." },
    { "name": "baidu_search", "description": "..." }
  ],
  "tabs": [
    { "tabid": "2EA73ED323E46E5E108D4E46DA4E4AA7", "title": "百度一下，你就知道", "url": "https://www.baidu.com/" }
  ]
}
```

**Important Rule:** Always call `webmcp-cli state` **BEFORE** executing any actions to get the latest element indices.

The `tabid` field in `tabs` is the **real Chrome target ID** (UUID). Use it with `-t` to target a specific tab.

---

### 3. `webmcp-cli run <tool-name> '<json-args>'`

**Description:** Executes an MCP tool on the active page.

```bash
# Click element at index 18
webmcp-cli run page-agent-tool '{"action": "click", "index": 18}'

# Fill text into input at index 13
webmcp-cli run page-agent-tool '{"action": "fill", "index": 13, "text": "Hello World"}'

# Scroll the page
webmcp-cli run page-agent-tool '{"action": "scroll", "down": true, "numPages": 1}'

# Execute JavaScript
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "document.title"}'

# Target a specific tab
webmcp-cli run page-agent-tool '{"action": "browserState"}' -t <targetId>
```

---

## Domain-Specific Tools

When `webmcp-cli open` navigates to certain domains, additional specialized tools are automatically injected. Check the `webmcpTools` array in `state` output to see what's available.

| Domain | Extra Tools | Sub-skill |
|--------|-------------|-----------|
| `excalidraw.com` | `excalidraw_execute_command` | [Read excalidraw guide ↓](#excalidraw) |
| `www.baidu.com` | `baidu_search`, `baidu_get_results` | [Read baidu guide ↓](#baidu) |

---

## Core Agent Constraints

1. **State dependency:** NEVER guess an element index. Always fetch the latest snapshot using `webmcp-cli state` before calling `webmcp-cli run`.
2. **Valid JSON:** Ensure arguments passed to `webmcp-cli run` are valid JSON strings wrapped in single quotes.
3. **Tab targeting:** Use the real `tabid` (UUID from `state` output) with `-t` to target specific tabs.
4. **Domain tools:** When on a supported domain, prefer domain-specific tools over generic `page-agent-tool` for better reliability.

---

<a id="excalidraw"></a>
## Domain Guide: excalidraw.com

When the current page is `excalidraw.com`, the tool `excalidraw_execute_command` is available.

### Commands

#### `getSceneElements` — Get all canvas elements

```bash
webmcp-cli run excalidraw_execute_command '{"eventName": "getSceneElements"}'
```

Returns an array of elements with `id`, `type`, `x`, `y`, `width`, `height`, etc. **Call this first before any modifications.**

#### `addElement` — Add one or more elements

```bash
webmcp-cli run excalidraw_execute_command '{"eventName": "addElement", "payload": "{\"eles\": [{\"type\": \"rectangle\", \"x\": 100, \"y\": 100, \"width\": 200, \"height\": 100}]}"}'
```

Element skeleton fields:

| Field | Type | Notes |
|-------|------|-------|
| `type` | string | Required. See types below |
| `x` | number | Required. Left-top X coordinate |
| `y` | number | Required. Left-top Y coordinate |
| `width` | number | Required (non-freedraw) |
| `height` | number | Required (non-freedraw) |
| `text` | string | Required for `text` type |
| `fontSize` | number | For `text` type, default 20 |
| `points` | `[number,number][]` | Required for `arrow`/`line`/`freedraw` |
| `strokeColor` | string | Default `#000000` |
| `backgroundColor` | string | Default `transparent` |
| `fillStyle` | string | `hachure`/`solid`/`cross-hatch`/`dots` |
| `roughness` | number | 0–2, default 1 |

Supported types: `rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`, `freedraw`

#### `updateElement` — Update existing elements

```bash
webmcp-cli run excalidraw_execute_command '{"eventName": "updateElement", "payload": "[{\"id\": \"<id>\", \"strokeColor\": \"#ff0000\"}]"}'
```

payload is an **array**; each item must include `id`.

#### `deleteElement` — Delete an element

```bash
webmcp-cli run excalidraw_execute_command '{"eventName": "deleteElement", "payload": "{\"id\": \"<id>\"}"}'
```

#### `cleanup` — Clear the canvas

```bash
webmcp-cli run excalidraw_execute_command '{"eventName": "cleanup"}'
```

### Drawing Workflow

1. `getSceneElements` → understand current state
2. Plan layout (origin at 0,0; x+ right, y+ down; 20–40px gaps between elements)
3. `addElement` with multiple `eles` in one call (more efficient)
4. Verify with `getSceneElements` again if needed

---

<a id="baidu"></a>
## Domain Guide: www.baidu.com

#### `baidu_search` — Execute a search

```bash
webmcp-cli run baidu_search '{"keyword": "OpenTiny"}'
```

Only works on the Baidu homepage (requires `#kw` and `#su` elements).

#### `baidu_get_results` — Get search results

```bash
webmcp-cli run baidu_get_results '{"limit": "10"}'
```

Returns an array of `{ title, url, summary }` from the current search results page.

### Baidu Workflow

1. Confirm URL is `https://www.baidu.com/`
2. Call `baidu_search` → page navigates to results
3. Call `webmcp-cli state` to confirm new page state
4. Call `baidu_get_results` to get result list
