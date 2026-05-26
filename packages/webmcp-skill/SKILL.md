---
name: webmcp-skill
description: Instructions and guidelines for third-party AI agents on how to install and execute webmcp-cli commands to interact with browser pages.
license: MIT
metadata:
  author: opentiny
  version: '1.0.0'
---

# WebMCP CLI Skill

This skill provides comprehensive instructions for third-party AI agents on how to use `webmcp-cli` to interact with browser pages (DOM querying, clicks, text input, scrolling, etc.). `webmcp-cli` bridges the AI agent to an actual browser using Model Context Protocol (MCP).

## When to use

- When you need to interact with a web page dynamically (e.g., clicking elements, filling forms).
- When you need to read the current DOM structure, specifically identifying interactive elements on the page.
- When evaluating the result of a browser interaction.

## Installation

To use `webmcp-cli`, the CLI needs to be installed globally or run via `npx` (if published) in the environment.

**Local Monorepo:**
If you are operating within the monorepo, the CLI is available by linking:
```bash
cd packages/webmcp-cli && pnpm link --global
```
*(Depending on permissions, you may need `sudo npm link`)*

**NPM Installation (When published):**
```bash
npm install -g @opentiny/webmcp-cli
```

## How to use `webmcp-cli`

`webmcp-cli` communicates with the browser and provides two main commands: `state` and `run`.

### Workspace Configuration (Important)
By default, the CLI uses a persistent profile at `~/.webmcp_chrome_profile` to bypass Chrome's security restrictions on the default user profile and keep login credentials saved across sessions.
You can override this workspace directory using the global `--workspace` flag or the `WEBMCP_WORKSPACE` environment variable.
Example:
```bash
webmcp-cli --workspace /path/to/custom/profile state
# Or
WEBMCP_WORKSPACE=/path/to/profile webmcp-cli state
```

### 1. `webmcp-cli state`

**Description:** Retrieves the current state of the browser, capturing a snapshot of all interactive elements.

**Usage:**
```bash
webmcp-cli state
```

**What it returns:**
It returns a JSON object containing the current URL, title, and most importantly, the `content` field. The `content` field contains the parsed DOM tree in a flat list format with **index numbers**, making it easy for AI to target specific elements.

**Example Output (Truncated):**
```json
{
  "content": "[0]<a target=_blank>新闻 />\\n[1]<a target=_blank>hao123 />\\n[13]<textarea placeholder=搜索 id=chat-textarea />\\n[18]<button id=chat-submit-button>百度一下 />",
  "url": "https://www.baidu.com/",
  "title": "百度一下，你就知道",
  "webmcpTools": [
    "page-agent-tool"
  ]
}
```

**Important Rule:** 
Always call `webmcp-cli state` to read the screen and get the latest `[index]` **BEFORE** executing any actions.

---

### 2. `webmcp-cli run`

**Description:** Executes an action on the page by calling an available MCP tool (typically `page-agent-tool`) with a specific JSON argument payload.

**Usage:**
```bash
webmcp-cli run <tool-name> '<json-args>'
```

**Examples:**

- **Clicking an element (e.g., index 18):**
  ```bash
  webmcp-cli run page-agent-tool '{"action": "click", "index": 18}'
  ```

- **Filling text into an input field (e.g., index 13):**
  ```bash
  webmcp-cli run page-agent-tool '{"action": "fill", "index": 13, "text": "Hello World"}'
  ```

- **Scrolling the page:**
  ```bash
  webmcp-cli run page-agent-tool '{"action": "scroll", "down": true, "numPages": 1}'
  ```

**What it returns:**
A JSON output detailing the success or failure of the action.

**Example Output:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "点击结果: {\"success\":true,\"message\":\"✅ Clicked element ([18]<button>百度一下).\"}"
    }
  ]
}
```

## Core Agent Constraints

1. **State dependency:** NEVER guess an element index. Always fetch the latest snapshot using `webmcp-cli state` before calling `webmcp-cli run` to interact with an element, as DOM changes frequently.
2. **Valid JSON argument:** Ensure the arguments passed into `webmcp-cli run` are properly formatted, valid JSON strings. Wrap the JSON string in single quotes `'{"action": ...}'` when running it via shell to prevent escaping issues.
3. **Handle new tabs:** Be aware that some clicks might open new tabs. The CLI evaluates the current top-level target page.

