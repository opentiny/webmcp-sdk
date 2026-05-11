# AI-Extension 浏览器插件技术架构文档

## 一、架构概述

AI-Extension 是一个基于 WXT 框架构建的智能浏览器扩展插件。通过集成标准的 MCP (Model Context Protocol) 协议，它能够将网页操作转化为可被 AI 智能体调用的工具（Tools）。

### 核心设计理念

- **标准 MCP 协议**：无缝对接本地和云端的各种 MCP 客户端（如 Cursor、CodeMate、各类云端 Agent）。
- **零侵入式集成**：通过浏览器扩展能力对网页进行解析和操作，不污染原有网页应用的代码。
- **跨环境大一统**：统一调度 Background 和 Sidepanel 逻辑，复用内置工具。
- **安全沙箱隔离**：敏感的 DOM 操作沉降至 Content Script 隔离世界，完美绕开现代 Web 应用严格的 CSP（内容安全策略）限制。
- **渐进式专业技能**：提供轻量级的 Skills（技能）目录树体系，让大模型按需查阅文档，降低幻觉。

## 二、架构拓扑与执行环境

现代浏览器插件拥有复杂的隔离环境，AI-Extension 巧妙地利用了各个环境的特性。

### 1. Background / Sidepanel (扩展核心调度)

- 统一在 `extraTools.ts` 中维护内置通用工具库（如 `tabs-manager` 标签页管理，`page-agent-tool` 页面操作）。
- 作为连接远程 Agent（通过 `useWebAgentServer.ts`）或本地 Sidepanel 会话的核心网关。
- 负责监听全局事件（如标签页切换），并向远程 Agent 主动推送 `list_changed` 通知以动态刷新工具列表。

### 2. Content Script (ISOLATED World)

- 运行在与当前页面 DOM 共享但 JS 上下文隔离的独立世界中。
- 负责注册 `PageController` 监听扩展内部的 `PAGE_CONTROL` 消息。
- 利用隔离特性，安全地读取和操作 DOM（`click`, `fill`, `select`, `scroll`），从而避免由于目标网页 CSP（如禁止 `eval` 或 `unsafe-inline`）导致的执行阻断。

### 3. Page Script (MAIN World)

- 直接运行在页面原始环境，通常通过 `mcp-servers/` 目录中的特定脚本通过 `browser.scripting.executeScript` 动态注入。
- 前端页面代码可以通过原生的 `navigator.modelContext.registerTool` 方法，为自己网站注册独有的复杂业务逻辑工具（WebMCP）。

---

## 三、核心技术机制

### 3.1 火眼金睛：多模态 DOM 解析机制

大模型“看不见”网页，因此我们通过 `page-agent-tool` 提供了**智能无障碍操作能力**：

1. **快照提取 (`browserState`)**：捕获当前页面所有的可视节点，生成带有数字索引 (Index) 的抽象 DOM 树与无障碍 (A11y) 语义信息。
2. **强制刷新 (`update_tree`)**：针对动态前端框架（如 React/Vue），页面在渲染后可能会发生大量变化。在执行任何点击、输入操作前，系统会自动触发 `update_tree` 更新索引，确保 AI 不会发生“刻舟求剑”的错位点击。
3. **精准打击**：AI 通过返回的索引执行 `click/fill` 操作。

> **操作优先级推荐**：DOM 解析（快稳准） > 无障碍信息补位 > 视觉模型（截图分析兜底） > 页面原生工具 WebMCP（降维打击复杂业务）。

### 3.2 动态工具刷新：瞬息万变的响应式武器库

用户在操作浏览器时会频繁切换标签页，不同页面的专属工具也会随之变化。AI-Extension 实现了实时工具列表更新：

- **触发时机**：当发生标签页切换 (`browser.tabs.onActivated`) 或当前页面的自定义工具完成注入 (`page-tools-updated`) 时触发。
- **通知机制**：基于 MCP 协议的 `notifications/tools/list_changed` 标准能力。Background 会向已连接的 Agent 客户端发送通知。
- **效果**：客户端（例如 Cursor）在收到通知后会立刻重新调用 `tools/list`，从而拉取到当前激活页面的独有工具。

### 3.3 借刀杀人：支持第三方远程 Agent

凭借标准化的协议与架构，该插件不仅仅能服务于本地侧边栏，更能作为一个连接物理浏览器的操作网关。

**典型场景：Cursor 遥控**
- 远端 Cursor 通过 MCP 配置连接我们的插件服务端。
- Cursor 利用内置工具 `tabs-manager` 控制浏览器切到百度。
- 插件发出 `list_changed`，Cursor 获取百度专属工具，并利用 `page-agent-tool` 完成搜索和点击动作。

### 3.4 赋能业务：页面自定义 WebMCP 工具

对于高度复杂的业务流转（如抢优惠券、发起审批流等），仅靠 DOM 点击可能非常脆弱。
我们可以利用 `navigator.modelContext.registerTool` 为页面暴露专属接口：

```typescript
if (navigator.modelContext) {
  navigator.modelContext.registerTool({
    name: 'submit-approval',
    title: '发起审批',
    description: '通过业务流程引擎发起一条请假或报销审批。',
    inputSchema: { /* Zod schema definitions */ },
    execute: async (args) => {
      // 这里的代码直接运行在页面的主上下文中，畅通无阻地调用内部方法或 Vue/React State
      const result = await MyInternalAppService.submit(args);
      return { content: [{ type: 'text', text: result.msg }] };
    }
  });
}
```

### 3.5 渐进式披露：技能系统 (Skills)

为避免将所有领域的 API 限制和开发规范一次性塞入系统 Prompt 导致 AI 幻觉和 token 爆炸，扩展采用了**渐进式披露 (Progressive Disclosure)** 的 Skills 系统：

- **定义**：按领域划分的文件夹结构（如 `.agents/skills/drawer-expert/SKILL.md`）。
- **机制**：系统仅在顶层给 AI 提供一个技能目录。AI 分析意图后，通过内置的 `view_file` 能力去翻阅对应的技能细则与参考资料，实现“即用即查”。

---

## 四、总结

AI-Extension 浏览器插件通过简洁直观的模块化架构实现了大一统：

1. 统一的内置工具分发与管理。
2. 完美隔离安全风险与 CSP 限制。
3. 拥抱 MCP 标准协议的工具动态刷新。
4. 无缝集成远程 AI 与本地能力。

作为 AI 与 Web 世界的超级网关，它为智能体深入操作和理解 Web 应用提供了坚固的工程基础。
