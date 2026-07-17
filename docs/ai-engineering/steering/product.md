# Product（仓级）

## 定位

**OpenTiny NEXT-SDKs** 是前端智能应用开发工具包：在浏览器中实现 Model Context Protocol（MCP），把前端能力暴露为可被 AI Agent 调用的工具。

## 核心价值

- **浏览器内置 WebMCP**：经 `initializeBuiltinWebMCP()` / `document.modelContext` 注册工具（主推；勿再以已弃用的 Server/Client 类作为默认路径）
- **page-agent-tool**：无障碍树 + 页面操作（点击、填表、滚动等），降低站点 a11y 缺失带来的 Agent 失真
- **next-remoter / TinyRobot**：对话 UI 与远程协作入口
- **webmcp-cli / next-wxt**：CLI 注入与浏览器扩展场景

## 目标用户

- 在自有 Web 应用中接入 AI Agent / MCP 的前端与全栈开发者
- 需要用自然语言操作复杂控制台页面的场景（如云控制台）

## 非目标（仓级）

- 不替代后端业务系统或通用 LLM 训练平台
- 不以某一 AI 编辑器私有配置为项目权威约束源
