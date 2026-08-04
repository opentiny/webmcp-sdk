---
name: recorder-to-webmcp
description: >-
  将用户粘贴的 Chrome DevTools Recorder（Puppeteer）测试脚本，转化为 next-wxt
  扩展侧 Recorder WebMCP 结构化工具，并调用 recorder_webmcp_save 落盘。
---

# Recorder → WebMCP Skill

当用户粘贴 **Chrome Recorder 导出的 Puppeteer 脚本**（含 `Locator.race`、`setViewport`、`goto`、`click`/`hover`/`type` 等），或明确要求「把录制脚本变成 WebMCP 工具」时，使用本 Skill。

## 架构要点（必读）

- 生成的工具跑在**扩展侧栏**，用 **`puppeteer-core` + ExtensionTransport** 操作**当前激活标签页**。
- **不要**生成 MAIN world / `document.modelContext.registerTool` 注入脚本。
- **不要**自研 DOM 兼容层；选择器与点击语义保持 Puppeteer Locator 习惯。
- 工具仅在 URL 命中 `@match` 时出现在侧栏工具列表（与现有「只加载当前激活页工具」一致）。
- 用户可在 Options → **Recorder 自动化** 中在线再编辑。

## 转化流程

1. 阅读用户粘贴的完整 Recorder 脚本。
2. **剥离** Node 生命周期：`launch` / `newPage` / `browser.close` / `setDefaultTimeout` 块级样板。优先**不要写入** `setViewport`（运行时也会跳过，以免改小视口导致页面右侧空白）。
3. 将剩余操作映射为结构化 `steps`（见下表）。
4. **参数化字面量（策略 3C）**：扫描可替换字符串（`type`/`fill` 文案、`goto` URL、断言文案等），智能决定哪些进入 `inputSchema`：
   - **应参数化**：业务输入（搜索词、表单字段、可变查询）、用户可能复用时改写的 URL。
   - **可保留常量**：固定演示站点首页、与流程强绑定且几乎不变的导航 URL、纯布局点击的无文案步骤。
   - 参数在 steps 中写成 `{ "$param": "paramName" }`。
5. 从首个 `goto` URL 推断 `@match`（如 `https://opentiny.design/foo` → `*://opentiny.design/*`）；若无法推断，询问用户或使用较窄模式。
6. 工具名使用 `recorder_` 前缀 + 简短英文 slug（仅字母数字下划线）。
7. 调用工具 **`recorder_webmcp_save`**，传入完整 `tool` 对象；可选把原始脚本放入 `sourceBackup`。
8. 告知用户：可在 Options「Recorder 自动化」继续改 steps / 参数；当前页需命中 `@match` 才能在工具列表看到。

## steps 映射

| Recorder / Puppeteer | step.op | 字段 |
|---|---|---|
| `setViewport({width,height})` | `setViewport`（可写入 steps，**运行时会跳过**） | 扩展侧保持用户当前窗口尺寸，禁止改视口 |
| `goto(url)` | `goto` | `url`: string \| `{ "$param": "..." }` |
| `Locator.race([...]).click({offset})` | `click` | `selectors: string[]`（三个候选都写入）, 可选 `offset` |
| `.hover()` | `hover` | `selectors` |
| 滚动 | `scroll` | 可选 `selectors`, `direction`: `up`\|`down` |
| `type` / `fill` / 键盘输入 | `type` 或 `fill` | `selectors`, `text`: string \| ParamRef |

选择器示例：保留 Recorder 给出的 CSS / `::-p-xpath(...)` / `:scope >>> ...` 字符串，原样放入 `selectors` 数组（runtime 使用 `Locator.race`）。

## 落盘 JSON 形状

```json
{
  "name": "recorder_opentiny_home_clicks",
  "title": "OpenTiny 首页 slogan 区点击",
  "description": "在 opentiny.design 首页对 slogan 区域执行录制的点击序列。",
  "matches": ["*://opentiny.design/*"],
  "enabled": true,
  "inputSchema": {
    "type": "object",
    "properties": {},
    "additionalProperties": false
  },
  "steps": [
    { "op": "goto", "url": "https://opentiny.design/" },
    {
      "op": "click",
      "selectors": [
        "div.home-slogan-content",
        "::-p-xpath(//*[@id=\"home-1\"]/div[2])",
        ":scope >>> div.home-slogan-content"
      ],
      "offset": { "x": 1130, "y": 43.734375 }
    }
  ],
  "sourceBackup": "（可选：用户原始脚本全文）"
}
```

含输入时的参数示例：

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "keyword": { "type": "string", "description": "搜索关键词" }
    },
    "required": ["keyword"]
  },
  "steps": [
    { "op": "goto", "url": "https://www.example.com/" },
    {
      "op": "fill",
      "selectors": ["input[name=q]"],
      "text": { "$param": "keyword" }
    }
  ]
}
```

## 调用

```text
recorder_webmcp_save({ tool: { ...上述对象 } })
```

若保存失败（非法 `@match`、空 steps、重名），根据错误信息修正后重试。

## 规则

1. 一次转化生成**一个**主工具；步骤过长时可拆成多个工具并分别 save，但须先征得用户同意。
2. 不要把 `tabs-manager` 或页面 MAIN 工具与本流程混用完成「落盘」。
3. 转化完成后用简短中文说明：工具名、match、哪些字段成了参数、如何在 Options 再编辑。
