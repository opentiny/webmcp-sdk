---
name: webmcp-skill
description: Instructions and guidelines for third-party AI agents on how to install and execute webmcp-cli commands to interact with browser pages. Includes domain-specific tool guides for pages with injected WebMCP tools.
license: MIT
metadata:
  author: opentiny
  version: '1.1.0'
---

# WebMCP CLI Skill

This skill provides comprehensive instructions for third-party AI agents on how to use `webmcp-cli` to interact with browser pages via Model Context Protocol (MCP).

## When to use

- When you need to interact with a web page (clicking elements, filling forms, scrolling).
- When you need to read the current DOM structure and identify interactive elements.
- When operating on pages with domain-specific injected tools (e.g., Excalidraw drawing tools).

## Installation

**Local Monorepo:**
```bash
cd packages/webmcp-cli && pnpm link --global
```

**NPM:**
```bash
npm install -g @opentiny/webmcp-cli
```

---

## Commands

### `webmcp-cli open <url>`

Opens a URL and automatically injects the WebMCP polyfill + any domain-specific tools.

```bash
webmcp-cli open https://excalidraw.com
webmcp-cli open https://www.baidu.com
```

### `webmcp-cli state`

Returns the current browser state: URL, title, interactive element indices, available tools, and open tabs.

```bash
webmcp-cli state
webmcp-cli state -t <targetId>   # target a specific tab by its real Chrome target ID
```

**Example output:**
```json
{
  "content": "[0]<a>新闻 />\n[13]<textarea placeholder=搜索 />\n[18]<button>百度一下</button>",
  "url": "https://www.baidu.com/",
  "title": "百度一下，你就知道",
  "webmcpTools": [
    { "name": "page-agent-tool" },
    { "name": "baidu_search" }
  ],
  "tabs": [
    { "tabid": "2EA73ED323E46E5E108D4E46DA4E4AA7", "title": "百度一下，你就知道", "url": "https://www.baidu.com/" }
  ]
}
```

> `tabid` is the **real Chrome target ID** (UUID). Use it with `-t` to target a specific tab.

**Rule: Always call `webmcp-cli state` BEFORE any action to get the latest element indices.**

### `webmcp-cli run <tool-name> '<json-args>'`

Executes an MCP tool on the active page.

```bash
# Click element at index 18
webmcp-cli run page-agent-tool '{"action": "click", "index": 18}'

# Fill text into input at index 13
webmcp-cli run page-agent-tool '{"action": "fill", "index": 13, "text": "Hello"}'

# Scroll the page
webmcp-cli run page-agent-tool '{"action": "scroll", "down": true, "numPages": 1}'

# Execute JavaScript
webmcp-cli run page-agent-tool '{"action": "executeJavascript", "script": "document.title"}'

# Target a specific tab
webmcp-cli run page-agent-tool '{"action": "browserState"}' -t <targetId>
```

---

## Domain-Specific Tools

When `webmcp-cli open` navigates to certain domains, specialized tools are automatically injected alongside the universal `page-agent-tool`. Check `webmcpTools` in the `state` output to confirm what's available.

| Domain | Injected Tools | When to read sub-skill |
|--------|----------------|------------------------|
| `excalidraw.com` | `excalidraw_execute_command` | **Read [domains/excalidraw.md](domains/excalidraw.md) whenever the current page URL contains `excalidraw.com` and you need to draw or manipulate canvas elements.** |
| `www.baidu.com` | `baidu_search`, `baidu_get_results` | No sub-skill needed; tool names are self-explanatory. |

### When to read `domains/excalidraw.md`

Read [domains/excalidraw.md](domains/excalidraw.md) if **any** of the following is true:

- The user asks you to draw a diagram, flowchart, architecture chart, or any visual on Excalidraw.
- The current page URL is `excalidraw.com` and `webmcpTools` includes `excalidraw_execute_command`.
- You need to add, update, delete, or query elements on the Excalidraw canvas.

---

## Core Constraints

1. **State dependency:** NEVER guess element indices. Always call `webmcp-cli state` first.
2. **Valid JSON:** Wrap JSON args in single quotes: `'{"action": ...}'`.
3. **Tab targeting:** Use the UUID `tabid` from `state` output with `-t` to target a specific tab.
4. **Domain tools:** Prefer domain-specific tools over `page-agent-tool` when available — they are more reliable for that domain's specific interactions.
