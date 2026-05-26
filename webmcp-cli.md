# WebMCP 架构设计与操作指南：webmcp-skill + webmcp-cli

## 架构简介

本项目为外部智能体（AI Agent）提供统一的命令行接口（CLI），用于操作浏览器：

- **webmcp-skill**：技能描述（`SKILL.md`、prompt、工作流规则）
- **webmcp-cli**：底层调度，通过 CDP 与页面内 WebMCP 协议交互

---

## 外部智能体操作浏览器核心工作流

### 1. 环境初始化与技能加载

外部通用智能体通过 `webmcp-skill` 安装并挂载 `webmcp-cli` 环境。

- **技能描述**：`webmcp-skill` 包含 prompt 指南与技能说明，指导智能体理解浏览器状态及 CLI 命令用法。

### 2. 浏览器接管与通信建立

`webmcp-cli` 负责接管或启动目标浏览器，建立底层通信通道。

- **启动命令**：后台执行 `chrome --remote-debugging-port=9222`，连接用户默认 Chrome。
- **协议封装**：使用 `puppeteer-core` 或 `playwright-core` 将 CDP 封装为可调用指令集。

### 3. 全局脚本与工具注入

通过 CDP，`webmcp-cli` 向所有已打开页签注入核心脚本。

- **注入内容**：向每个页面注入 `page-agent-tool`（WebMCP 运行环境），支撑后续页面交互与工具调用。

### 4. CLI 核心能力：State 与 Run

`webmcp-cli` 提供浏览器状态查询与 WebMCP 工具调用能力。

#### 4.1 获取浏览器最新状态（`state`）

获取当前页面汇总信息及可用工具描述（符合 LLM Function Calling 标准）。

**命令格式：**

```bash
webmcp-cli state [--tabid <id>]
```

> 不传 `--tabid` 时，返回当前激活页签的状态。

**返回数据结构示例：**

```json
{
  "content": "...",
  "url": "https://example.com",
  "title": "Example Domain",
  "tabs": [
    { "tabid": 1, "title": "Google", "url": "https://google.com" },
    { "tabid": 2, "title": "Example Domain", "url": "https://example.com" }
  ],
  "webmcpTools": [
    {
      "name": "page-agent-tool",
      "description": "对当前页面可交互元素执行操作（点击、输入、悬停等）。",
      "parameters": {
        "type": "object",
        "properties": {
          "index": {
            "type": "number",
            "description": "元素索引 ID（从 content 汇总数据中获取）"
          },
          "action": {
            "type": "string",
            "enum": ["click", "input", "hover", "scroll"],
            "description": "操作类型"
          },
          "value": {
            "type": "string",
            "description": "action 为 input 时的输入文本"
          }
        },
        "required": ["index", "action"]
      }
    },
    {
      "name": "extract-text-tool",
      "description": "提取页面正文或指定区域文本。",
      "parameters": {
        "type": "object",
        "properties": {
          "selector": {
            "type": "string",
            "description": "可选。CSS 选择器；不传则提取全页正文"
          }
        }
      }
    }
  ]
}
```

#### 4.2 调用内置 WebMCP 工具（`run`）

向指定 WebMCP 工具传递 JSON 参数，执行页面操作。

**通用命令格式：**

```bash
webmcp-cli run <工具名称> "<参数JSON>" [--tabid <id>]
```

**执行示例**（使用 `page-agent-tool` 点击元素）：

```bash
webmcp-cli run page-agent-tool '{"index": 12, "action": "click"}'
```

> 不传 `--tabid` 时，在当前激活页签中执行。

### 5. 智能体调度与自动闭环

外部智能体读取 `webmcp-skill` 指导后，基于 LLM 推理拼接 `state` 与 `run` 命令：

| 阶段 | 命令 | 作用 |
|------|------|------|
| 读取与规划 | `state` | 获取页面上下文与工具列表 |
| 决策与执行 | `run` | 调用工具完成点击、输入、滚动等操作 |

---

## 业界成熟技术选型建议

为保证 CLI 稳定性与开发效率，底层封装可参考以下方案。

### CLI 框架（命令解析与路由）

| 方案 | 特点 | 适用场景 |
|------|------|----------|
| [Oclif](https://oclif.io/) | 企业级、子命令与插件体系完善 | 多子命令（`state`、`run`）的复杂 CLI |
| [Commander.js](https://github.com/tj/commander.js) | 轻量、生态成熟 | 快速定义命令与参数 |
| [CAC](https://github.com/cacjs/cac) | 极简 API | 追求最小依赖的 CLI |

### CDP 协议封装（浏览器底层操作）

| 方案 | 特点 | 适用场景 |
|------|------|----------|
| [Puppeteer-core](https://pptr.dev/) | 连接已有 Chrome debug 端口，无需捆绑 Chromium | 包体积敏感、Chrome 专用 |
| [Playwright-core](https://playwright.dev/) | 多 Tab、iframe、并发表现较好 | 复杂页面与多标签场景 |
