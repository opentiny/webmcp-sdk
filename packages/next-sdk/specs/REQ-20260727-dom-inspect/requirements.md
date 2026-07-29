# Spec：DOM 元素检视（公共能力）

## 元信息

- 状态：已交付
- 主责包：`packages/next-sdk`
- 协作包：`packages/webmcp-cli`（消费方）

## 背景

原先检视能力耦合在 webmcp-cli 注入层，并依赖 `inspect-element` 工具 + tabId/elementId 引用协议。现改为：点击元素直接复制 Cursor 同款元数据；能力下沉为 next-sdk 公开模块，开发态可直接引入，webmcp-cli 复用同一套。

## 范围

### In Scope

- next-sdk 导出 `enableInspectAssist` / `disableInspectAssist` 等 API
- 浮钮切换检视；点击复制 `DOM Path` / `Position` / `HTML Element`
- 移除 `inspect-element` 工具与 `webmcp-inspect:v1` 引用协议
- webmcp-cli 注入改为调用 next-sdk API
- 测试与文档

### Out of Scope

- 通过工具改 live 样式
- tabId / 可操作 id 协议

## 用户故事

1. 作为应用开发者，我希望 `import { enableInspectAssist } from '@opentiny/next-sdk'` 后在开发态点选复制元素卡片，以便快速定位并修改区域样式/逻辑。
2. 作为 webmcp-cli 用户，我希望注入后仍有浮钮与点选复制，且剪贴板已是完整元数据，无需再调工具。

## 完成定义

- [x] Spec / 实现 / 测试 / 文档
- [x] 剪贴板格式：键值同行 + 摘要行 + 【】修改意见引导
